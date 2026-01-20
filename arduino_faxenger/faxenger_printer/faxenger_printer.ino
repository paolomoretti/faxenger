/*
 * Faxenger Printer Firmware
 *
 * Hardware: ESP8266 + Thermal Printer
 * Features:
 * - WiFi Connectivity with auto-scan and strongest signal selection
 * - TCP Socket Client for receiving messages
 * - OTA Update support
 * - Watchdog Timer (WDT) management via yield()
 * - Command handling (e.g. >blink) ignoring print
 */

#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ArduinoOTA.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>

// --- Configuration ---
#define TX_PIN 5   // Arduino transmit  (YELLOW WIRE)
#define RX_PIN 4   // Arduino receive   (BLUE WIRE)
#define LED_PIN 12 // Status LED (D6)

#define PRINTER_BAUDRATE 9600
#define LOGS_BAUDRATE 115200

// --- WiFi Configuration ---
const char *SSIDS[] = {"Sestra hive", "giardufficio"};
const char *WIFI_PWDS[] = {"haivenetvuorc", "Ej*!pGwvbJaN5pah"};
const int WIFI_TIMEOUT_MS = 20000;

// --- Server Configuration ---
const char *TCP_SERVER_IP = "192.168.0.101";
const int TCP_SERVER_PORT = 9000;
const char *DEVICE_ALIAS = "Sari";

// --- Global Objects ---
SoftwareSerial mySerial(RX_PIN, TX_PIN);
Adafruit_Thermal printer(&mySerial);
WiFiClient client;

// --- Function Prototypes ---
void connectToWiFi();
bool connectToTCP();
bool isWiFiConnected();
void onDataAvailable();
void printWrapped(String text);
void setupOTA();

void setup() {
  // 1. Initialize Serial for Logs
  Serial.begin(LOGS_BAUDRATE);
  Serial.println("\n\n--- Faxenger Printer Starting ---");

  // 2. Initialize Hardware
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start OFF

  // 3. Initialize Printer Serial
  mySerial.begin(PRINTER_BAUDRATE);

  // 4. Connect to WiFi
  Serial.println("Connecting to WiFi...");
  unsigned long startWifi = millis();

  connectToWiFi();
  while (!isWiFiConnected()) {
    Serial.println("Retry connection sequence...");
    connectToWiFi();
    delay(1000);
  }

  unsigned long wifiDuration = millis() - startWifi;
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // 5. Connect to TCP Server
  if (!connectToTCP()) {
    Serial.println("Connection to host failed");
    // We continue anyway to allow OTA updates
  }

  // 6. Configure Printer
  printer.begin();
  printer.setDefault();
  printer.setHeatConfig(4, 220, 250); // Dots=4, Time=220, Interval=250
  printer.setLineHeight(1);
  printer.boldOn();
  printer.doubleWidthOff();

  // Print Startup Ticket
  printer.wake();
  printer.println(F("\n"));
  printer.print(DEVICE_ALIAS);
  printer.println(F(" connected!"));

  printer.print(F("SSID: "));
  printer.println(WiFi.SSID());

  printer.print(F("Time: "));
  printer.print(wifiDuration / 1000);
  printer.println(F("s"));

  // Calculate Signal Quality (0-100%)
  long rssi = WiFi.RSSI();
  int quality = constrain(2 * (rssi + 100), 0, 100);

  printer.print(F("Signal: "));
  printer.print(quality);
  printer.println(F("%"));

  printer.feed(2);
  printer.sleep();

  // 7. Setup OTA
  setupOTA();
}

void loop() {
  ArduinoOTA.handle();
  delay(10); // Small delay to allow background tasks

  // Main Connection Loop
  while (isWiFiConnected()) {
    ArduinoOTA.handle();

    // TCP Connection Loop
    while (client.connected()) {
      ArduinoOTA.handle();
      yield(); // Prevent WDT reset

      while (client.available() > 0) {
        onDataAvailable();
        yield();
      }
    }

    // TCP Disconnected Handling
    Serial.println("\nTCP client disconnected");
    if (isWiFiConnected()) {
      Serial.println("WiFi active, attempting TCP reconnect...");
      connectToTCP();

      // Non-blocking wait for 2 seconds
      unsigned long startWait = millis();
      while (millis() - startWait < 2000) {
        ArduinoOTA.handle();
        delay(10);
      }
    }
  }

  // WiFi Disconnected Handling
  Serial.println("\nWiFi disconnected, attempting reconnect...");
  connectToWiFi();

  // Non-blocking wait for 5 seconds
  unsigned long startWait = millis();
  while (millis() - startWait < 5000) {
    ArduinoOTA.handle();
    delay(10);
  }
}

// --- Helper Functions ---

bool isWiFiConnected() { return WiFi.status() == WL_CONNECTED; }

bool connectToTCP() {
  if (client.connect(TCP_SERVER_IP, TCP_SERVER_PORT)) {
    Serial.print("\nConnected to TCP server: ");
    Serial.print(TCP_SERVER_IP);
    Serial.print(":");
    Serial.println(TCP_SERVER_PORT);

    // Send ALIAS handshake
    client.print("ALIAS:");
    client.print(DEVICE_ALIAS);

    Serial.print("Handshake sent: ALIAS:");
    Serial.println(DEVICE_ALIAS);
    return true;
  }
  return false;
}

void setupOTA() {
  ArduinoOTA.onStart([]() { Serial.println("OTA Start"); });
  ArduinoOTA.onEnd([]() { Serial.println("\nOTA End"); });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR)
      Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR)
      Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR)
      Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR)
      Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR)
      Serial.println("End Failed");
  });

  ArduinoOTA.begin();
  Serial.println("OTA Ready");
}

/*
 * Scans for available networks and connects to the one with the best RSSI
 * that matches our known list.
 */
void connectToWiFi() {
  int knownCount = (sizeof(SSIDS) / sizeof(SSIDS[0]));

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.println("Scanning networks...");
  int n = WiFi.scanNetworks();
  Serial.println("Scan done");

  if (n == 0) {
    Serial.println("No networks found");
    return;
  }

  // Arrays to store best RSSI for each known SSID
  // candidateRssi[i] holds the best RSSI found for ssids[i]
  int candidateRssi[knownCount];
  for (int i = 0; i < knownCount; i++) {
    candidateRssi[i] = -1000;
  }

  // 1. Analyze Scan Results
  for (int i = 0; i < n; ++i) {
    String currentSSID = WiFi.SSID(i);
    int currentRSSI = WiFi.RSSI(i);

    for (int k = 0; k < knownCount; k++) {
      if (currentSSID == String(SSIDS[k])) {
        // Keep the best signal for this SSID (in case of multiple APs)
        if (currentRSSI > candidateRssi[k]) {
          candidateRssi[k] = currentRSSI;
        }
      }
    }
  }

  // 2. Sort known SSIDs by signal strength (Simple Bubble Sort)
  int indices[knownCount];
  for (int i = 0; i < knownCount; i++)
    indices[i] = i;

  for (int i = 0; i < knownCount - 1; i++) {
    for (int j = 0; j < knownCount - i - 1; j++) {
      if (candidateRssi[indices[j]] < candidateRssi[indices[j + 1]]) {
        int temp = indices[j];
        indices[j] = indices[j + 1];
        indices[j + 1] = temp;
      }
    }
  }

  // 3. Attempt Connection in Order
  for (int i = 0; i < knownCount; i++) {
    int ssidIdx = indices[i];

    // Skip if network wasn't found
    if (candidateRssi[ssidIdx] == -1000)
      continue;

    Serial.print("Attempting: ");
    Serial.print(SSIDS[ssidIdx]);
    Serial.print(" (");
    Serial.print(candidateRssi[ssidIdx]);
    Serial.println("dBm)");

    WiFi.begin(SSIDS[ssidIdx], WIFI_PWDS[ssidIdx]);

    unsigned long startTime = millis();

    // Wait for connection with LED feedback
    while (
        (WiFi.status() == WL_IDLE_STATUS || WiFi.status() == WL_DISCONNECTED) &&
        (millis() - startTime < WIFI_TIMEOUT_MS)) {

      Serial.print(".");

      // Fast Blink Pattern
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(1500);

      yield(); // Critical for WDT
    }
    Serial.println("");

    if (isWiFiConnected()) {
      Serial.println("WiFi Connected!");

      // Solid LED confirmation
      digitalWrite(LED_PIN, HIGH);
      delay(2000);
      digitalWrite(LED_PIN, LOW);

      WiFi.setAutoReconnect(true);
      return;
    } else {
      Serial.println("Failed to connect.");
    }
  }

  Serial.println("Could not connect to any known network.");

  // Last check fallback
  if (isWiFiConnected()) {
    digitalWrite(LED_PIN, HIGH);
    delay(2000);
    digitalWrite(LED_PIN, LOW);
    WiFi.setAutoReconnect(true);
  }
}

/*
 * Reads data from TCP client, handles "command logic" or prints.
 */
void onDataAvailable() {
  String clientCommand = "";
  bool shouldPrint = true;
  String messageToPrint = "";

  while (client.available()) {
    char c = (char)client.read();

    // Command Mode Detection
    if (c == '>') {
      clientCommand = ">";
      shouldPrint = false;
      Serial.println("Command mode detected");
    } else {
      clientCommand += c;
    }

    bool outputCommand = false;

    // --- Command Handling ---
    if (clientCommand == ">blink") {
      client.write("LOG:Blinking");
      // Blink 10 times
      for (int k = 0; k < 10; k++) {
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
        delay(500);
        yield();
      }
      outputCommand = true;
    }

    if (outputCommand) {
      clientCommand = "";
      shouldPrint = true;
      continue;
    }

    if (shouldPrint) {
      messageToPrint += c;
    }
    yield();
  }

  // Debug Output
  if (clientCommand.length() > 0) {
    Serial.print("[CMD_BUF]: ");
    Serial.println(clientCommand);
  }
  yield();

  // Print Handling
  if (messageToPrint.length() > 0) {
    // Immediate Solid ON
    digitalWrite(LED_PIN, HIGH);

    printWrapped(messageToPrint);
    printer.println(F("\n--------------------------------"));

    // Keep ON for 2s after print
    delay(2000);
    digitalWrite(LED_PIN, LOW);

    Serial.println("Message printed");
    client.write("LOG:Received and printed");
  } else if (!shouldPrint) {
    Serial.println("Skipped: Partial command or empty payload");
  }
}

/*
 * Wraps text to printer width (approx 30 chars/line)
 */
void printWrapped(String text) {
  int limit = 30;
  int lineLen = 0;
  String word = "";

  for (int i = 0; i < text.length(); i++) {
    char c = text.charAt(i);

    if (c == ' ' || c == '\n') {
      // Check if word fits
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
        // Space handling
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

  // Print remaining word
  if (word.length() > 0) {
    if (lineLen + word.length() > limit) {
      printer.println();
    }
    printer.print(word);
  }
}
