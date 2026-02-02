#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ======================= CONFIGURATION =======================
const char* ssid = "Guest";
const char* password = "chatgpt26";
// Point this to your backend hardware route (adjust IP/hostname as needed)
const String backendUrl = "http://192.168.42.22:3000/api/hardware/esp32"; 
const String authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcwMDM2MjIyLCJleHAiOjE3NzAxMjI2MjJ9.UpEC7CblYVCgGk6yw7rnGP26cQsVEMHz3AKUNA4Hy2M";

// LED Pins
const int RED_PIN = 25;
const int YELLOW_PIN = 26;
const int GREEN_PIN = 27;
const int POLL_DELAY = 1000; 

// Track WiFi state for logging state changes
bool lastWiFiConnected = false;
unsigned long lastRequestTime = 0;
unsigned int requestCount = 0;

// =============================================================

void setup() {
  Serial.begin(115200);
  delay(2000); // Give serial monitor time to connect
  
  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════════════════════╗");
  Serial.println("║   🚦 ESP32 Traffic Signal Controller Starting ║");
  Serial.println("╚═══════════════════════════════════════════════╝");
  
  // Initialize LED pins
  pinMode(RED_PIN, OUTPUT);
  pinMode(YELLOW_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, LOW);
  
  Serial.println("\n[SETUP] GPIO Pins configured:");
  Serial.printf("  - RED   (GPIO %d): Initialized\n", RED_PIN);
  Serial.printf("  - YELLOW (GPIO %d): Initialized\n", YELLOW_PIN);
  Serial.printf("  - GREEN (GPIO %d): Initialized\n", GREEN_PIN);
  
  // Test LEDs
  Serial.println("\n[SETUP] Testing LEDs...");
  Serial.println("  → Lighting RED...");
  digitalWrite(RED_PIN, HIGH);
  delay(500);
  digitalWrite(RED_PIN, LOW);
  
  Serial.println("  → Lighting YELLOW...");
  digitalWrite(YELLOW_PIN, HIGH);
  delay(500);
  digitalWrite(YELLOW_PIN, LOW);
  
  Serial.println("  → Lighting GREEN...");
  digitalWrite(GREEN_PIN, HIGH);
  delay(500);
  digitalWrite(GREEN_PIN, LOW);
  Serial.println("[SETUP] LED test complete\n");
  
  // Connect to WiFi
  Serial.printf("[WIFI] Attempting to connect to SSID: '%s'\n", ssid);
  Serial.println("[WIFI] Connecting to WiFi.");
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  const int maxAttempts = 40; // ~20 seconds timeout
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ [WIFI] WiFi Connected Successfully!");
    Serial.printf("[WIFI] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] SSID: %s\n", WiFi.SSID().c_str());
    Serial.printf("[WIFI] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());
    lastWiFiConnected = true;
  } else {
    Serial.println("\n❌ [WIFI] Failed to connect after 20 seconds");
    Serial.printf("[WIFI] WiFi Status Code: %d\n", WiFi.status());
  }
  
  Serial.println("\n[BACKEND] Configuration:");
  Serial.printf("  URL: %s\n", backendUrl.c_str());
  Serial.println("  Authorization: Bearer [JWT Token Loaded]");
  Serial.printf("  Poll Interval: %d ms\n\n", POLL_DELAY);
}

void loop() {
  unsigned long loopStartTime = millis();
  
  // Check WiFi status and log changes
  bool currentWiFiStatus = (WiFi.status() == WL_CONNECTED);
  
  if (currentWiFiStatus != lastWiFiConnected) {
    if (currentWiFiStatus) {
      Serial.println("\n✅ [WIFI] WiFi RECONNECTED");
      Serial.printf("[WIFI] IP Address: %s\n\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n❌ [WIFI] WiFi DISCONNECTED\n");
    }
    lastWiFiConnected = currentWiFiStatus;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    requestCount++;
    Serial.printf("\n[REQUEST #%u] Starting HTTP POST request to hardware route\n", requestCount);
    Serial.printf("[REQUEST] URL: %s\n", backendUrl.c_str());

    HTTPClient http;
    http.setConnectTimeout(5000); // 5 second timeout
    http.setTimeout(5000);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["deviceId"] = "esp32-traffic-01";
    doc["status"] = "heartbeat";
    doc["ip"] = WiFi.localIP().toString();
    doc["uptime_ms"] = millis();

    String outPayload;
    serializeJson(doc, outPayload);

    Serial.println("[REQUEST] Sending HTTP POST with payload:");
    Serial.println(outPayload);

    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");
    // If your hardware route requires auth, uncomment and set the token above
    // http.addHeader("Authorization", authToken);

    int httpResponseCode = http.POST(outPayload);
    unsigned long requestDuration = millis() - loopStartTime;

    Serial.printf("[REQUEST] HTTP Response Code: %d\n", httpResponseCode);
    Serial.printf("[REQUEST] Request Duration: %lu ms\n", requestDuration);

    if (httpResponseCode > 0) {
      String resp = http.getString();
      Serial.printf("[RESPONSE] %d bytes\n", resp.length());
      Serial.println(resp);
      lastRequestTime = millis();
    } else {
      Serial.print("[ERROR] HTTP POST failed - Code: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("[WIFI] Status: DISCONNECTED - Waiting for connection...");
  }
  
  // Calculate actual delay
  unsigned long actualDelay = POLL_DELAY - (millis() - loopStartTime);
  if (actualDelay > 0) {
    delay(actualDelay);
  }
}

void updateLights(const char* level) {
  Serial.println("[LED] Updating LED state...");
  
  // Turn off all LEDs first
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, LOW);
  Serial.println("[LED] All LEDs turned OFF");
  
  if (!level) {
    Serial.println("[LED] ⚠️  Congestion level is NULL - No LED activated\n");
    return;
  }
  
  if (strcmp(level, "high") == 0) {
    digitalWrite(RED_PIN, HIGH);
    Serial.println("[LED] 🔴 RED LED activated (High Congestion)\n");
  } else if (strcmp(level, "medium") == 0) {
    digitalWrite(YELLOW_PIN, HIGH);
    Serial.println("[LED] 🟡 YELLOW LED activated (Medium Congestion)\n");
  } else if (strcmp(level, "low") == 0) {
    digitalWrite(GREEN_PIN, HIGH);
    Serial.println("[LED] 🟢 GREEN LED activated (Low Congestion)\n");
  } else {
    Serial.printf("[LED] ⚠️  Unknown congestion level: '%s' - No LED activated\n\n", level);
  }
}
