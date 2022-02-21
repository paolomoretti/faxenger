#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"
#define TX_PIN 4 // Arduino transmit  YELLOW WIRE  labeled TX on printer
#define RX_PIN 5 // Arduino receive   BLUE WIRE   labeled RX on printer
#define BAUDRATE  9600

SoftwareSerial mySerial(RX_PIN, TX_PIN); // Declare SoftwareSerial obj first
Adafruit_Thermal printer(&mySerial);     // Pass addr to printer constructor

void setup() {
  mySerial.begin(BAUDRATE);
  printer.begin();

  printer.setDefault();
  printer.println(F("Adafruit!"));
  printer.feed(1);
}

void loop() {
  
}
