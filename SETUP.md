# Faxenger Project Setup Overview

## Hardware Architecture

### Components

- **Microcontroller**: ESP8266 (NodeMCU/Wemos D1 Mini type board).
- **Printer**: Adafruit Thermal Printer (TTL Serial).
- **Power Supply**: 9V Source.
- **Power Management**: Buck Converter (likely steps down 9V to 5V/3.3V for the ESP).
- **Indicators**:
  - External LED on Pin D6 (GPIO 12).
  - Resistor (560Ω, Green-Blue-Brown-Gold).
- **Mounting**: Small breadboard inside a box.

### Wiring & Connections

- **Power Distribution**:
  - **9V Source** -> Directly powers the Thermal Printer.
  - **9V Source** -> Buck Converter -> Powers the ESP8266.
- **Data Connections**:
  - **Printer TX/RX** -> ESP8266 (SoftwareSerial communication).
    - Printer TX (Yellow) -> ESP Pin 5 (D1).
    - Printer RX (Blue) -> ESP Pin 4 (D2).
- **Feedback**:
  - **LED** (Pin D6) -> Resistor -> GND (Active High logic).

## Network & Connectivity

- **Communication Protocol**: WiFi (Station Mode) + TCP Socket.
- **WiFi Behavior**:
  - Scans for known SSIDs (`Sestra hive`, `giardufficio`).
  - Connects to the strongest signal.
  - Retries/Fallbacks implemented.

## Software Stack

### Printer Firmware (ESP8266)

- **Codebase**: `faxenger_printer.ino`.
- **Functions**:
  - Manages WiFi connection.
  - Connects to TCP Server.
  - Controls Thermal Printer (Adafruit Library).
  - Handles LED status patterns (double blink connecting, solid connected/printing).
  - Implements word-wrapping for 30-char width.

### Backend / Server

- **Host**: QNAP NAS (Hostname: `sestra`).
- **Environment**: Docker Container (Container Station).
- **TCP Server**:
  - **Port**: 9000.
  - **Code**: `server/tcp.server.class.js` (Node.js).
  - **Role**: Maintains connection with the ESP printer, sends messages.

### Frontend

- **Interface**: Web Application.
- **Host**: `sestra`.
- **Port**: 3303.
- **Function**: UI to compose and send messages to the printer.

## Potential Integrations

- **Home Assistant**:
  - **Status**: Fully working and connected on a separate server.
  - **Potential Use**: Automation triggers, notification source, state monitoring.
