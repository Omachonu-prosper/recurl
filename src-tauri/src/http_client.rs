use serde::Serialize;
use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue}};
use std::time::Instant;
use std::str::FromStr;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{Mutex, Notify};
use tauri::State;

pub struct RequestState(pub Arc<Mutex<HashMap<String, Arc<Notify>>>>);

#[derive(Serialize)]
pub struct HttpResponseData {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
    pub time_ms: u64,
    pub size_bytes: usize,
}

#[tauri::command]
pub async fn send_http_request(
    state: State<'_, RequestState>,
    req_id: String,
    method: String,
    url: String,
    body: String,
    headers: String,
) -> Result<HttpResponseData, String> {
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    let url = if !url.starts_with("http://") && !url.starts_with("https://") {
        format!("http://{}", url)
    } else {
        url
    };

    let client = Client::new();
    let req_method = Method::from_str(&method).map_err(|_| "Invalid HTTP method".to_string())?;
    
    let mut header_map = HeaderMap::new();
    for line in headers.lines() {
        let line = line.trim();
        if line.is_empty() { continue; }
        if let Some((k, v)) = line.split_once(':') {
            if let (Ok(k_name), Ok(v_val)) = (HeaderName::from_str(k.trim()), HeaderValue::from_str(v.trim())) {
                header_map.insert(k_name, v_val);
            }
        }
    }

    let mut request_builder = client.request(req_method, &url).headers(header_map);
    if !body.is_empty() {
        request_builder = request_builder.body(body);
    }

    let notify = Arc::new(Notify::new());
    {
        let mut map = state.0.lock().await;
        map.insert(req_id.clone(), notify.clone());
    }

    let request_future = request_builder.send();
    let start_time = Instant::now();

    let response_result = tokio::select! {
        res = request_future => res,
        _ = notify.notified() => {
            return Err("Request cancelled".to_string());
        }
    };

    {
        let mut map = state.0.lock().await;
        map.remove(&req_id);
    }

    let response = response_result.map_err(|e| e.to_string())?;
    let time_ms = start_time.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();
    
    let mut res_headers = Vec::new();
    for (name, value) in response.headers() {
        res_headers.push((name.as_str().to_string(), value.to_str().unwrap_or("").to_string()));
    }

    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let size_bytes = body_bytes.len();
    let res_body_text = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponseData {
        status,
        status_text,
        headers: res_headers,
        body: res_body_text,
        time_ms,
        size_bytes,
    })
}

#[tauri::command]
pub async fn cancel_http_request(state: State<'_, RequestState>, req_id: String) -> Result<(), String> {
    let mut map = state.0.lock().await;
    if let Some(notify) = map.remove(&req_id) {
        notify.notify_one();
    }
    Ok(())
}
