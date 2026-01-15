#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#define TX_PIN 5 // 0/5 Arduino transmit  YELLOW WIRE labeled TX on printer
#define RX_PIN 4 // 2/4 Arduino receive   BLUE WIRE labeled RX on printer
#define PRINTER_BAUDRATE 9600
#define LOGS_BAUDRATE 4800
#define LED_PIN 12 // D6 GPIO 12

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

char *ssids[] = {"Sestra hive", "giardufficio"};
char *wifipwds[] = {"haivenetvuorc", "Ej*!pGwvbJaN5pah"};
char *wifiStatus[] = {"TIMEOUT",    "IDLE",       "NO_SSID_AVAILABLE",
                      "UNKNOWN(2)", "CONNECTED",  "FAILED_CONNECTION",
                      "UNKNOWN(5)", "UNKNOWN(6)", "DISCONNECTED"};
char *alias = "Sari";
WiFiClient client;

const char *TCP_SERVER_IP = "192.168.0.101";
int TCP_SERVER_PORT = 9000;

void connectToWiFi() {
  int wifiCount = (sizeof(ssids) / sizeof(ssids[0]));
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.println("Scanning for networks...");
  int n = WiFi.scanNetworks();
  Serial.println("Scan done");

  if (n == 0) {
    Serial.println("No networks found");
    return;
  }

  // Identify candidates
  int candidates[wifiCount];
  int candidateRssi[wifiCount];
  int candidateCount = 0;

  // Initialize candidates
  for (int i = 0; i < wifiCount; i++) {
    candidates[i] = -1;
    candidateRssi[i] = -1000;
  }

  // Find matches and store best RSSI for each known SSID
  for (int i = 0; i < n; ++i) {
    String currentSSID = WiFi.SSID(i);
    int currentRSSI = WiFi.RSSI(i);

    // Note: ESP8266 only sees 2.4GHz. If you see duplicates, they are multiple
    // APs (BSSIDs).
    for (int k = 0; k < wifiCount; k++) {
      if (currentSSID == String(ssids[k])) {
        // We found a match. Is it the first time or a better signal?
        bool alreadyInList = false;
        // Check if we already have this known SSID in our candidate list (to
        // update RSSI) Actually simpler: just array of best RSSI per known SSID
        // index
        if (currentRSSI > candidateRssi[k]) {
          candidateRssi[k] = currentRSSI;
          // If it wasn't marked as found yet, increment count?
          // We'll filter later.
        }
      }
    }
  }

  // Create a sorted list of indices to try
  // Simple bubble sort or just pick passes. Max 3-5 ssids, so simple is fine.
  // We will try networks in order of RSSI.

  // Create a temporary array of indices to sort
  int indices[wifiCount];
  for (int i = 0; i < wifiCount; i++)
    indices[i] = i;

  // Sort indices based on candidateRssi descending
  for (int i = 0; i < wifiCount - 1; i++) {
    for (int j = 0; j < wifiCount - i - 1; j++) {
      if (candidateRssi[indices[j]] < candidateRssi[indices[j + 1]]) {
        int temp = indices[j];
        indices[j] = indices[j + 1];
        indices[j + 1] = temp;
      }
    }
  }

  // Now try connecting in order
  for (int i = 0; i < wifiCount; i++) {
    int ssidIdx = indices[i];
    if (candidateRssi[ssidIdx] == -1000)
      continue; // Not found in scan

    Serial.println("\nAttempting: " + String(ssids[ssidIdx]) + " (" +
                   String(candidateRssi[ssidIdx]) + "dBm)");
    WiFi.begin(ssids[ssidIdx], wifipwds[ssidIdx]);

    unsigned long startTime = millis();
    // Wait up to 20 seconds per network
    while (
        (WiFi.status() == WL_IDLE_STATUS || WiFi.status() == WL_DISCONNECTED) &&
        (millis() - startTime < 20000)) {
      Serial.print(".");
      // Fast double blink pattern (~1.9s cycle)
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(1500);
    }
    Serial.println("");

    if (isWiFiConnected()) {
      Serial.println("Connected!");
      // Solid light for 2 seconds
      digitalWrite(LED_PIN, HIGH);
      delay(2000);
      digitalWrite(LED_PIN, LOW);

      WiFi.setAutoReconnect(true);
      return; // Exit function on success
    } else {
      Serial.println("Failed to connect to " + String(ssids[ssidIdx]));
    }
  }

  Serial.println("Could not connect to any known network.");

  // Check if connected via fallback (implied fallthrough)
  if (isWiFiConnected()) {
    // Solid light for 2 seconds (Fallback success)
    digitalWrite(LED_PIN, HIGH);
    delay(2000);
    digitalWrite(LED_PIN, LOW);
    WiFi.setAutoReconnect(true);
  }
}

bool isWiFiConnected() { return WiFi.status() == WL_CONNECTED; }

bool connectToTCP() {
  if (client.connect(TCP_SERVER_IP, TCP_SERVER_PORT)) {
    Serial.println("\nConnected to TCP server on " + String(TCP_SERVER_IP) +
                   ":" + String(TCP_SERVER_PORT));
    char buf[strlen("ALIAS:") + strlen(alias)];
    strcpy(buf, "ALIAS:");
    strcat(buf, alias);
    client.write(buf);
    Serial.println("Set ALIAS to " + String(alias));
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(LOGS_BAUDRATE);
  mySerial.begin(PRINTER_BAUDRATE);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start OFF (Active High)
  delay(10);

  Serial.println("Connecting to WIFI...");
  unsigned long startWifi = millis();

  // Setup WIFI
  connectToWiFi();
  while (!isWiFiConnected()) {
    Serial.println("Retry connection sequence...");
    connectToWiFi();
    delay(1000);
  }
  unsigned long wifiDuration = millis() - startWifi;
  Serial.print("\nIP address: ");
  Serial.print(WiFi.localIP());

  if (!connectToTCP()) {
    Serial.println("\nConnection to host failed");
    delay(1000);
    return;
  }

  // Setup printer
  printer.begin();
  printer.setDefault();
  // Dots=4 (Low Current), Time=220 (High Heat), Interval=250 (Slow recovery)
  printer.setHeatConfig(4, 220, 250);
  printer.setLineHeight(1);
  printer.boldOn();
  printer.doubleWidthOff();
  printer.wake();
  printer.println(F("\n"));
  char *connectionHello = " connected!";
  char buf[strlen(alias) + strlen(connectionHello)];
  strcpy(buf, alias);
  strcat(buf, connectionHello);
  printer.println(buf);

  printer.print(F("SSID: "));
  printer.println(WiFi.SSID());
  printer.print(F("Time: "));
  printer.print(wifiDuration / 1000);
  printer.println(F("s"));

  long rssi = WiFi.RSSI();
  int quality = 2 * (rssi + 100);
  if (quality > 100)
    quality = 100;
  if (quality < 0)
    quality = 0;

  printer.print(F("Signal: "));
  printer.print(quality);
  printer.println(F("%"));
  printer.feed(2);
  printer.doubleWidthOff();

  printer.sleep();
}

void printWrapped(String text) {
  int limit = 30;
  int lineLen = 0;
  String word = "";

  for (int i = 0; i < text.length(); i++) {
    char c = text.charAt(i);

    if (c == ' ' || c == '\n') {
      if (lineLen + word.length() > limit) {
        printer.println();
        lineLen = 0;
      }
      printer.print(word);
      lineLen += word.length();
      word = "";

      if (c == '\n') {
        printer.println();
        lineLen = 0;
      } else {
        if (lineLen < limit) {
          printer.print(" ");
          lineLen++;
        } else {
          printer.println();
          lineLen = 0;
        }
      }
    } else {
      word += c;
    }
  }
  if (word.length() > 0) {
    if (lineLen + word.length() > limit) {
      printer.println();
    }
    printer.print(word);
  }
}

void onDataAvailable() {
  // Message coming in
  String clientCommand = "";
  int h = client.available();
  bool shouldPrint = true;
  //  printer.wake();

  //  if (!printer.hasPaper()) {
  //    client.write("LOG:Error:NO_PAPER");
  //  }

  // Read all available bytes
  String messageToPrint = "";

  while (client.available()) {
    uint8_t chunk = client.read();
    clientCommand += (char)chunk;

    // Command filtering logic
    if (clientCommand == ">" && shouldPrint) {
      shouldPrint = false;
      Serial.print("Skip message\n");
    }

    if (shouldPrint) {
      messageToPrint += (char)chunk;
    }
  }
  Serial.print("[START]\n");
  Serial.print(clientCommand);
  Serial.print("[END]\n");
  if (shouldPrint) {
    if (messageToPrint.length() > 0) {
      // 1. Blink for 3 seconds
      for (int i = 0; i < 6; i++) {
        digitalWrite(LED_PIN, HIGH); // ON
        delay(250);
        digitalWrite(LED_PIN, LOW); // OFF
        delay(250);
      }

      // 2. Solid ON while printing
      digitalWrite(LED_PIN, HIGH);

      printWrapped(messageToPrint);
      printer.println(F(""));
      printer.println(F("--------------------------------"));

      // 3. Keep ON for 2 seconds then OFF
      delay(2000);
      digitalWrite(LED_PIN, LOW);
    }
    Serial.print("Printed\n");
    client.write("LOG:Received and printed");
  } else {
    // Check if command should trigger an action
    Serial.print("Skipped\n");
    if (clientCommand == ">doubleWidthOn") {
      client.write("LOG:Set bold text");
      printer.doubleWidthOn();
    }
    if (clientCommand == ">inverseOn") {
      client.write("LOG:Set inverse text");
      printer.inverseOn();
    }

    if (clientCommand == ">reset") {
      client.write("LOG:Reset style");
      printer.setDefault();
    }
  }

  //  printer.sleep();
}

void loop() {
  while (isWiFiConnected()) {
    while (client.connected()) {
      while (client.available() > 0) {
        onDataAvailable();
      }
    }
    // TCP client disconnected
    Serial.print("\nTCP client disconnected");
    if (isWiFiConnected()) {
      Serial.print("\nWiFi still on, try reconnect to TCP client");
      connectToTCP();
      delay(2000);
    }
  }
  // Exit WiFi loop, try to reconnect
  Serial.print("\nWiFi not connected, try reconnect");
  connectToWiFi();
  delay(5000);
}
