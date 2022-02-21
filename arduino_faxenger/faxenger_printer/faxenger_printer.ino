#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#define TX_PIN 4 // Arduino transmit  YELLOW WIRE  labeled TX on printer
#define RX_PIN 5 // Arduino receive   BLUE WIRE   labeled RX on printer
#define PRINTER_BAUDRATE  9600
#define LOGS_BAUDRATE  4800

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

const char* ssid = "bitterg";
const char* password = "casapiton47";
WiFiClient client;

const char* caciottaIP = "192.168.86.198";
int port = 9000;  //Port number
//WiFiServer server(port);

void setup() {
  Serial.begin(LOGS_BAUDRATE);
  Serial.print("Connecting to WIFI...");
  
  // Setup WIFI
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  delay(500);
  Serial.print("\nConnected to WIFI " + String(ssid));
  Serial.print("\nIP address: ");
  Serial.print(WiFi.localIP());

  if (!client.connect(caciottaIP, port)) {
    Serial.println("Connection to host failed");
    delay(1000);
    return;
  } 
  Serial.println("Connected to TCP server on " + String(caciottaIP) + ":" + String(port));
  client.write("ALIAS:Paolo");

  // Setup printer
  mySerial.begin(PRINTER_BAUDRATE);
  printer.begin();
  printer.setDefault();
  printer.setHeatConfig(11, 200, 100);
  printer.setLineHeight(24);
  printer.boldOn();
//  printer.doubleWidthOn();
  printer.wake();
  printer.println(F("Hey, I'm ready!!"));
  printer.feed(1);
}

void loop() {
  while(client.connected()) {
    while(client.available() > 0) {
      printer.write(client.read());
//      Serial.write(client.read());
    }
  }
}
