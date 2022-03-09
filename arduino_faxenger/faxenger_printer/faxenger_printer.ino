#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#define TX_PIN 4 // Arduino transmit  YELLOW WIRE labeled TX on printer
#define RX_PIN 5 // Arduino receive   BLUE WIRE labeled RX on printer
#define PRINTER_BAUDRATE  9600
#define LOGS_BAUDRATE  4800

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

char* alias = "Sari";
const char* ssid = "bitterg";
const char* password = "casapiton47";
WiFiClient client;

const char* TCP_SERVER_IP = "sestra.local";
//const char* TCP_SERVER_IP = "192.168.86.209";
int TCP_SERVER_PORT = 9000;

void connectToWiFi() {
  WiFi.begin(ssid, password);
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
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(LOGS_BAUDRATE);
  Serial.print("Connecting to WIFI...");

  // Setup WIFI
  connectToWiFi();
  while (!isWiFiConnected()) {
    delay(500);
  }
  delay(500);
  Serial.print("\nConnected to WIFI " + String(ssid));
  Serial.print("\nIP address: ");
  Serial.print(WiFi.localIP());

  if (!connectToTCP()) {
    Serial.println("Connection to host failed");
    delay(1000);
    return;
  }

  // Setup printer
  mySerial.begin(PRINTER_BAUDRATE);
  printer.begin();
  printer.setDefault();
  printer.setHeatConfig(11, 200, 100);
  printer.setLineHeight(1);
  printer.boldOn();
  printer.doubleWidthOn();
  printer.wake();
  printer.println(F("\n"));
  char buf[strlen(alias) + strlen(" ready!")];
  strcpy(buf, alias);
  strcat(buf, " ready!");
  printer.println(buf);
  printer.doubleWidthOff();
  printer.feed(1);
}

void loop() {
  while (isWiFiConnected()) {
    while(client.connected()) {
      String clientCommand;
      clientCommand= "";
      
      while(client.available() > 0) {
        // Message coming in
        int h = client.available();
  
        for (int i = 0; i < h; i++) {
          uint8_t chunk = client.read();
          clientCommand+= (char)chunk;
          printer.write(chunk);
        }
        Serial.print("[START]\n");
        Serial.print(clientCommand);
        Serial.print("[END]\n");
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
