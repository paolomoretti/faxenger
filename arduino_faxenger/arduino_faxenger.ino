#include <ESP8266WiFi.h>
#include <WiFiClient.h>
//#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>

const char* ssid = "bitterg";
const char* password = "casapiton47";
WiFiClient client;

//ESP8266WebServer server(80);


#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
//#define TX_PIN 10 // Arduino transmit  YELLOW WIRE  labeled RX on printer
#define TX_PIN 1 // Arduino transmit  YELLOW WIRE  labeled RX on printer
//#define RX_PIN 11 // Arduino receive   GREEN WIRE   labeled TX on printer
#define RX_PIN 2 // Arduino receive   GREEN WIRE   labeled TX on printer
//
SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

//void printMessage(msg) {
  //  printer.setDefault();
//  printer.wake();
//  printer.println(F("Ciao ciao ciariiiiii!\nA breve ti scrivero' i messaggi qui!!"));
//  printer.feed(2);

//  printer.sleep();
//}

const char* caciottaIP = "192.168.86.198";
int port = 9000;  //Port number
WiFiServer server(port);


void setup() {
  Serial.begin(9600);
  Serial.println("Connecting to WIFI...");
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  delay(500);
  Serial.print("\nConnected to WIFI " + String(ssid));
  Serial.print("\nIP address: ");
  Serial.println(WiFi.localIP());

  if (!client.connect(caciottaIP, port)) {
    Serial.println("Connection to host failed");
    delay(1000);
    return;
  } else {
    Serial.println("Connected to TCP server on " + String(caciottaIP) + ":" + String(port));
    client.write("ALIAS:test1");
    mySerial.begin(9600);
    printer.begin();
    printer.wake();
    printer.println("HEY");
  }
}

void loop() {
  while(client.connected()) {
    while(client.available() > 0) {
      printer.println(client.read());
//      Serial.write(client.read());
    }
  }
}
