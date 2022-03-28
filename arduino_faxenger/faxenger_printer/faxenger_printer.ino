#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#define TX_PIN 5 // 0/5 Arduino transmit  YELLOW WIRE labeled TX on printer
#define RX_PIN 4 // 2/4 Arduino receive   BLUE WIRE labeled RX on printer
#define PRINTER_BAUDRATE  9600
#define LOGS_BAUDRATE  4800

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

char* ssids[] = {"Casapiton", "bitterg"};
char* wifipwds[] = {"casapiton47", "casapiton47"};
char* wifiStatus[] = {"TIMEOUT", "IDLE", "NO_SSID_AVAILABLE", "UNKNOWN(2)", "CONNECTED", "FAILED_CONNECTION", "UNKNOWN(5)", "UNKNOWN(6)", "DISCONNECTED"};
char* alias = "Pablo";
WiFiClient client;

const char* TCP_SERVER_IP = "sestra.local";
//const char* TCP_SERVER_IP = "192.168.86.209";
int TCP_SERVER_PORT = 9000;

void connectToWiFi() {
  int wifiCount = (sizeof(ssids) / sizeof(ssids[0]));
  /*
   * WL_IDLE_STATUS => 0
   * WL_NO_SSID_AVAIL => 1
   * WL_CONNECTED => 3
   * WL_CONNECT_FAILED => 4
   * WL_DISCONNECTED => 7
   */
  
  for (byte i = 0; i < wifiCount && !isWiFiConnected(); i++) {
    Serial.println("\nWiFi connecting to " + String(ssids[i]));
    WiFi.begin(ssids[i], wifipwds[i]);

    while(WiFi.status() == WL_IDLE_STATUS || WiFi.status() == WL_DISCONNECTED) {
      Serial.print(".");
      delay(500);
    }
    Serial.println("\n");
    Serial.println("Status: " + String(wifiStatus[WiFi.status() + 1]));
  }
  if (isWiFiConnected()) {
    WiFi.setAutoReconnect(true);
  }
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool connectToTCP() {
  if (client.connect(TCP_SERVER_IP, TCP_SERVER_PORT)) {
    Serial.println("\nConnected to TCP server on " + String(TCP_SERVER_IP) + ":" + String(TCP_SERVER_PORT));
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
  delay(10);
  
  Serial.println("Connecting to WIFI...");
  
  // Setup WIFI
  connectToWiFi();
  while (!isWiFiConnected()) {
    delay(500);
  }
  Serial.print("\nIP address: ");
  Serial.print(WiFi.localIP());

  if (!connectToTCP()) {
    Serial.println("Connection to host failed");
    delay(1000);
    return;
  }

  // Setup printer
  printer.begin();
  printer.setDefault();
  printer.setHeatConfig(11, 200, 100);
  printer.setLineHeight(1);
  printer.boldOn();
  printer.doubleWidthOn();
  printer.wake();
  printer.println(F("\n"));
  char* connectionHello = " connected!";
  char buf[strlen(alias) + strlen(connectionHello)];
  strcpy(buf, alias);
  strcat(buf, connectionHello);
  printer.println(buf);
  printer.feed(2);
  printer.doubleWidthOff();

  printer.sleep();
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
  
  for (int i = 0; i < h; i++) {
    uint8_t chunk = client.read();
    clientCommand+= (char)chunk;
    if (clientCommand == ">" && shouldPrint) {
      shouldPrint = false;
      Serial.print("Skip message\n");
    }
    if (shouldPrint) {
      printer.write(chunk);
    }
  }
  Serial.print("[START]\n");
  Serial.print(clientCommand);
  Serial.print("[END]\n");
  if (shouldPrint) {
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
    while(client.connected()) {
      while(client.available() > 0) {
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
