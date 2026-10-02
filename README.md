# CIGA Companion

A lightweight, customizable companion widget for StreamElements Custom Widgets.

CIGA Companion gives streamers a small interactive character that can speak, react to chat, respond to configured messages, and display customizable speech bubbles — all without requiring a separate backend.

Built by **CIGA Systems**.

---

## Features

### Companion

* Custom companion name
* Custom PNG, JPG, or animated GIF
* Adjustable base image size
* Adjustable visual scale
* Idle breathing animation
* Optional companion name
* Custom name color and size
* Adjustable name spacing

### Shadow

* Optional companion shadow
* Adjustable opacity
* Adjustable blur
* Adjustable width and height
* Adjustable vertical offset

### Random Speech

The companion can automatically speak random configured lines at randomized intervals.

* Enable/disable random speech
* Configurable minimum interval
* Configurable maximum interval
* Multiple random lines
* `{user}`, `{username}`, `{bot}`, `{message}` and `{value}` variables where applicable

Use `|` to separate random lines.

Example:

```text
I'm watching.|Did someone say something?|I'm hungry.|Interesting...
```

### Chat Greetings

The companion can react to simple greetings from viewers.

Supported examples:

```text
hello
hi
hey
good morning
good afternoon
good evening
```

Greeting triggers are case-insensitive and accent-insensitive.

Responses can contain:

```text
{user}
```

Example:

```text
Hello, {user}!|Hey, {user}!|Welcome, {user}!
```

A configurable greeting cooldown prevents repeated greetings from flooding the widget.

### Custom Responses

CIGA Companion supports up to **10 independent custom response rules**.

Each rule can use one of four modes:

#### AFTER

Respond when a message starts with the configured Start Text.

Example:

```text
Start Text:
CIGA // Song added to queue:

Response:
{value} has been added to the queue.
```

A message such as:

```text
CIGA // Song added to queue: Ghost - Dance Macabre
```

can produce:

```text
Ghost - Dance Macabre has been added to the queue.
```

#### BETWEEN

Capture text between a Start Text and an End Text.

Example:

```text
Start:
[

End:
]
```

Message:

```text
[hello world]
```

Captured value:

```text
hello world
```

#### COMMAND

Wait for a configured bot/sender to answer a viewer command.

Example:

```text
Command Trigger:
!search
```

A viewer can send:

```text
!search Ghost
```

The Companion recognizes `!search` and allows the text after the command to remain part of the viewer message.

The configured bot response can then be used as the Companion response.

#### EXACT

Respond only when the complete message matches the configured text.

Matching ignores capitalization, accents, and surrounding whitespace.

Example:

```text
Ghost - Dance Macabre
```

matches:

```text
ghost - dance macabre
```

but does not match:

```text
ghost - dance macabre something else
```

---

## Response Variables

Custom responses support:

```text
{value}
{user}
{username}
{bot}
{message}
```

### `{value}`

The text captured by an `AFTER` or `BETWEEN` rule.

### `{user}`

The viewer's display name.

### `{username}`

The viewer's username.

### `{bot}`

The configured bot/sender name.

### `{message}`

The complete message received by the Companion.

---

## Text-to-Speech

CIGA Companion uses the StreamElements speech endpoint through the widget's StreamElements channel token.

Available voices are configured directly in the widget settings.

Features include:

* Enable/disable TTS
* Multiple language and voice options
* Adjustable volume
* Automatic text cleaning
* Preservation of real chat commands such as `!yt`, `!joke`, `!commands`, etc.
* Removal of decorative box characters, excessive formatting, HTML, and unsupported visual symbols

The widget keeps the visible bubble text and TTS processing separate.

### Bubble

The bubble can have its own:

* Background color
* Text color
* Border color
* Font size
* Maximum width
* Duration
* Vertical spacing

`Maximum Bubble Characters` only controls how much text is visually displayed.

### TTS

The TTS text is processed independently and respects the StreamElements speech request limit.

The widget limits the TTS request to approximately **490 characters** to stay below the endpoint's character limit.

---

## Installation

### 1. Create a StreamElements Custom Widget

Open your StreamElements dashboard and create a new **Custom Widget**.

### 2. Add the files

Copy the project files into the corresponding Custom Widget sections:

```text
HTML     → index.html
CSS      → style.css
JS       → script.js
Fields   → fields.json
```

### 3. Configure the widget

Upload your companion image and configure the available settings.

At minimum, configure:

```text
Enabled
Companion Image
Companion Name
TTS settings
```

### 4. Save

StreamElements custom widget settings are applied after saving the widget configuration.

---

## Performance

CIGA Companion is designed to remain lightweight.

The widget:

* Uses a single companion
* Uses no external backend
* Does not continuously poll an external API for chat
* Uses StreamElements' event system for chat messages
* Uses timers only when random speech is enabled
* Keeps the speech queue limited
* Avoids unnecessary repeated network requests

---

## Privacy

CIGA Companion does not include its own analytics, tracking system, database, or external backend.

The widget operates inside the StreamElements Custom Widget environment and uses information supplied by StreamElements for chat and TTS functionality.

Do not add personal API keys, tokens, passwords, or other credentials directly to the source code before publishing your own version.

---

## Customization

CIGA Companion is intentionally generic.

The included configuration demonstrates what is possible, but the widget is not tied to CIGA Systems commands, bots, music systems, or services.

Streamers can configure their own:

* Companion
* Bot names
* Commands
* Responses
* Greetings
* Random speech
* Visual style
* TTS voice
* Bubble appearance

For example, a streamer can use:

```text
!discord
!socials
!schedule
!rules
!song
!queue
```

without changing the JavaScript.

---

## Project Structure

```text
ciga-companion/
├── README.md
├── LICENSE
├── fields.json
├── index.html
├── style.css
├── script.js
└── ciga.png
```

---

## Credits

Created by **CIGA Systems**.

CIGA Systems develops tools, software, bots, widgets, and interactive experiences for creators and communities.

---

## License

CIGA Companion is released under the **MIT License**.

See [`LICENSE`](LICENSE) for the complete license text.
