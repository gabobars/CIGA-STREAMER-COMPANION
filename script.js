// ============================================================
// CIGA COMPANION
// StreamElements Custom Widget
// ============================================================

(function () {
    "use strict";

    // ============================================================
    // DOM
    // ============================================================

    const root = document.getElementById("companion-root");
    const companion = document.getElementById("companion");
    const petAnchor = document.getElementById("pet-anchor");
    const petImage = document.getElementById("pet-image");
    const petShadow = document.getElementById("pet-shadow");

    const companionInfo = document.getElementById("companion-info");
    const companionName = document.getElementById("companion-name");

    const companionBubble = document.getElementById("companion-bubble");
    const bubbleText = document.getElementById("bubble-text");

    const audio = document.getElementById("companion-audio");

    // ============================================================
    // STATE
    // ============================================================

    const state = {
        loaded: false,
        fieldData: {},
        apiToken: "",
        greetingCooldownUntil: 0,

        settings: {
            enabled: true,
            showHelpTips: false,
            helpNotice: "",
            companionName: "COMPANION",
            petImage: "",
            petSize: 300,
            petScale: 1,
            petBottomOffset: 20,
            idleDistance: 8,
            shadowEnabled: true,
            shadowOpacity: 0.35,
            shadowBlur: 12,
            shadowScaleX: 0.85,
            shadowScaleY: 0.25,
            shadowOffsetY: 8,
            randomSpeechEnabled: true,
            randomSpeechMinSec: 60,
            randomSpeechMaxSec: 180,
            randomLines: [],
            greetingEnabled: true,
            greetingTriggers: [],
            greetingResponses: [],
            greetingCooldownSec: 15,
            queueLimit: 4,
            maxMessageCharacters: 500,
            maxBubbleCharacters: 250,
            commandEnabled: false,
            command: "!ciga",
            commandTimeoutSec: 8,
            ttsEnabled: true,
            ttsVoice: "Brian",
            ttsVolume: 1,
            nameEnabled: true,
            nameColor: "#ffffff",
            nameFontSize: 22,
            nameGap: 8,
            bubbleBackground: "rgba(0, 0, 0, 0.85)",
            bubbleTextColor: "#ffffff",
            bubbleBorderColor: "rgba(255, 255, 255, 0.15)",
            bubbleFontSize: 20,
            bubbleMaxWidth: 520,
            bubbleDurationSec: 6,
            bubbleGap: 10
        },

        customResponses: [],
        speechQueue: [],
        processingQueue: false,
        randomSpeechTimer: null,
        bubbleTimer: null,
        pendingCommands: [],
        currentObjectUrl: null,
        talking: false
    };

    // ============================================================
    // BASIC HELPERS
    // ============================================================

    function stringValue(value, fallback) {
        if (value === undefined || value === null) return fallback;
        const result = String(value).trim();
        return result || fallback;
    }

    function numberValue(value, fallback, min, max) {
        let result = Number(value);
        if (!Number.isFinite(result)) result = fallback;
        if (min !== undefined) result = Math.max(min, result);
        if (max !== undefined) result = Math.min(max, result);
        return result;
    }

    function booleanValue(value, fallback) {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
            if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
        }
        return fallback;
    }

    function textLines(value) {
        if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
        return String(value || "").split(/\r?\n|\|/).map(line => line.trim()).filter(Boolean);
    }

    function triggerLines(value) {
        if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
        return String(value || "").split(/\r?\n|,|;|\|/).map(item => item.trim()).filter(Boolean);
    }

    function randomItem(array) {
        if (!Array.isArray(array) || !array.length) return "";
        return array[Math.floor(Math.random() * array.length)];
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function normalizeForComparison(value) {
        return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // ============================================================
    // IMAGE & TEXT CLEANING
    // ============================================================

    function resolveImageSource(value) {
        if (!value) return "";
        if (typeof value === "string") return value.trim();
        if (typeof value === "object") {
            if (typeof value.url === "string") return value.url.trim();
            if (typeof value.src === "string") return value.src.trim();
            if (typeof value.value === "string") return value.value.trim();
        }
        return "";
    }

    function getCacheBustedImageUrl(source) {
        const imageSource = String(source || "").trim();
        if (!imageSource) return "";
        const separator = imageSource.includes("?") ? "&" : "?";
        return imageSource + separator + "ciga_companion=" + Date.now();
    }

    function escapeHtml(value) {
        return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function cleanBubbleText(value) {
        return String(value || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
    }

    function cleanForTTS(value) {
        let text = String(value || "");

        if (!text.trim()) {
            return "";
        }

        const placeholders = [];

        /*
        * Preserve real chat commands such as:
        * !yt
        * !joke
        * !commands
        * !gamble
        * !pokemon
        */
        text = text.replace(
            /![a-z0-9][a-z0-9_-]*/gi,
            function (match) {
                const token = "CIGACOMMANDTOKEN" + placeholders.length + "CIGA";
                placeholders.push(match);
                return token;
            }
        );

        /*
        * Remove HTML.
        */
        text = text
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, " ");

        /*
        * Remove decorative box characters.
        */
        text = text.replace(
            /[\u2500-\u257F]/g,
            " "
        );

        /*
        * Remove separators and bracket-style formatting.
        */
        text = text.replace(
            /[|/\\]+/g,
            " "
        );

        text = text.replace(
            /[<>{}\[\]]+/g,
            " "
        );

        /*
        * Remove markdown / formatting symbols.
        */
        text = text.replace(
            /[*_~`^#=]+/g,
            " "
        );

        /*
        * Remove emoji and miscellaneous pictographic symbols.
        */
        text = text.replace(
            /[\u{1F000}-\u{1FAFF}]/gu,
            " "
        );

        text = text.replace(
            /[\u{2600}-\u{27BF}]/gu,
            " "
        );

        /*
        * Restore the original commands.
        */
        placeholders.forEach(function (command, index) {
            const token =
                "CIGACOMMANDTOKEN" +
                index +
                "CIGA";

            text = text.split(token).join(command);
        });

        /*
        * Normalize whitespace.
        */
        return text
            .replace(/\s+/g, " ")
            .trim();
    }
    // ============================================================
    // SETTINGS
    // ============================================================

    function readSettings(fieldData) {
        const data = fieldData || {};

        state.settings.enabled = booleanValue(data.enabled, true);
        state.settings.showHelpTips = booleanValue(data.showHelpTips, false);
        state.settings.helpNotice = stringValue(data.helpNotice, "");
        state.settings.companionName = stringValue(data.companionName, "COMPANION");
        state.settings.petImage = resolveImageSource(data.petImage);
        state.settings.petSize = numberValue(data.petSize, 300, 50, 2000);
        state.settings.petScale = numberValue(data.petScale, 1, 0.1, 5);
        state.settings.petBottomOffset = numberValue(data.petBottomOffset, 20, -2000, 2000);
        state.settings.idleDistance = numberValue(data.idleDistance, 8, 0, 100);

        state.settings.shadowEnabled = booleanValue(data.shadowEnabled, true);
        state.settings.shadowOpacity = numberValue(data.shadowOpacity, 0.35, 0, 1);
        state.settings.shadowBlur = numberValue(data.shadowBlur, 12, 0, 100);
        state.settings.shadowScaleX = numberValue(data.shadowScaleX, 0.85, 0.1, 3);
        state.settings.shadowScaleY = numberValue(data.shadowScaleY, 0.25, 0.05, 3);
        state.settings.shadowOffsetY = numberValue(data.shadowOffsetY, 8, -200, 200);

        state.settings.randomSpeechEnabled = booleanValue(data.randomSpeechEnabled, true);
        state.settings.randomSpeechMinSec = numberValue(data.randomSpeechMinSec, 60, 1, 86400);
        state.settings.randomSpeechMaxSec = numberValue(data.randomSpeechMaxSec, 180, 1, 86400);
        state.settings.randomLines = textLines(data.randomLines);

        state.settings.greetingEnabled = booleanValue(data.greetingEnabled, true);
        state.settings.greetingTriggers = triggerLines(data.greetingTriggers).map(item => normalizeForComparison(item));
        state.settings.greetingResponses = textLines(data.greetingResponses);
        state.settings.greetingCooldownSec = numberValue(data.greetingCooldownSec, 15, 0, 3600);

        state.settings.queueLimit = numberValue(data.queueLimit, 4, 1, 50);
        state.settings.maxMessageCharacters = numberValue(data.maxMessageCharacters, 500, 1, 10000);
        state.settings.maxBubbleCharacters = numberValue(data.maxBubbleCharacters, 250, 1, 10000);

        state.settings.commandEnabled = booleanValue(data.commandEnabled, false);
        state.settings.command = stringValue(data.command, "!ciga").toLowerCase();
        state.settings.commandTimeoutSec = numberValue(data.commandTimeoutSec, 8, 1, 120);

        state.settings.ttsEnabled = booleanValue(data.ttsEnabled, true);
        state.settings.ttsVoice = stringValue(data.ttsVoice, "Brian");
        state.settings.ttsVolume = numberValue(data.ttsVolume, 1, 0, 1);

        state.settings.nameEnabled = booleanValue(data.nameEnabled, true);
        state.settings.nameColor = stringValue(data.nameColor, "#ffffff");
        state.settings.nameFontSize = numberValue(data.nameFontSize, 22, 6, 100);
        state.settings.nameGap = numberValue(data.nameGap, 8, 0, 200);

        state.settings.bubbleBackground = stringValue(data.bubbleBackground, "rgba(0, 0, 0, 0.85)");
        state.settings.bubbleTextColor = stringValue(data.bubbleTextColor, "#ffffff");
        state.settings.bubbleBorderColor = stringValue(data.bubbleBorderColor, "rgba(255, 255, 255, 0.15)");
        state.settings.bubbleFontSize = numberValue(data.bubbleFontSize, 20, 6, 100);
        state.settings.bubbleMaxWidth = numberValue(data.bubbleMaxWidth, 520, 50, 2000);
        state.settings.bubbleDurationSec = numberValue(data.bubbleDurationSec, 6, 0.5, 120);
        state.settings.bubbleGap = numberValue(data.bubbleGap, 10, 0, 200);

        buildCustomResponses(data);
    }

    // ============================================================
    // CUSTOM RESPONSES MAPPING
    // ============================================================

    function buildCustomResponses(fieldData) {
        const data = fieldData || {};
        const responses = [];

        for (let i = 1; i <= 10; i++) {
            const prefix = "customResponse" + i;
            responses.push({
                index: i,
                enabled: booleanValue(data[prefix + "Enabled"], false),
                bot: stringValue(data[prefix + "BotName"], ""),
                mode: stringValue(data[prefix + "Mode"], "AFTER").toUpperCase(),
                command: stringValue(data[prefix + "Command"], ""),
                exact: stringValue(data[prefix + "ExactText"], ""),
                start: stringValue(data[prefix + "Start"], ""),
                end: stringValue(data[prefix + "End"], ""),
                response: stringValue(data[prefix + "Response"], ""),
                ignore: booleanValue(data[prefix + "Ignore"], false)
            });
        }
        state.customResponses = responses;
    }

    function isKnownConfiguredBot(senderName) {
        const sender = normalizeForComparison(senderName);
        if (!sender) return false;
        return state.customResponses.some(function (rule) {
            return rule.enabled && rule.bot && normalizeForComparison(rule.bot) === sender;
        });
    }

    function isViewerMessage(data) {
        if (!data) return false;
        if (data.isBot === true) return false;
        const sender = data.displayName || data.username || data.nick || "";
        if (isKnownConfiguredBot(sender)) return false;
        return true;
    }

    // ============================================================
    // VISUALS
    // ============================================================

    function applyVisualSettings() {
        if (!root || !petAnchor || !petImage) return;

        if (!state.settings.enabled) {
            root.style.display = "none";
            hideBubble();
            setTalking(false);
            return;
        }

        const imageSource = resolveImageSource(state.settings.petImage);

        if (!imageSource) {
            root.style.display = "none";
            petAnchor.style.display = "none";

            if (companionName) {
                companionName.style.display = "none";
            }

            hideBubble();
            setTalking(false);
            return;
        }

        root.style.display = "";
        petAnchor.style.display = "block";

        petAnchor.style.width = state.settings.petSize + "px";
        petAnchor.style.height = state.settings.petSize + "px";

        root.style.bottom =
            state.settings.petBottomOffset + "px";

        root.style.setProperty(
            "--pet-size",
            state.settings.petSize + "px"
        );

        root.style.setProperty(
            "--pet-scale",
            String(state.settings.petScale)
        );

        root.style.setProperty(
            "--idle-distance",
            state.settings.idleDistance + "px"
        );

        petImage.style.width = "100%";
        petImage.style.height = "100%";
        petImage.style.objectFit = "contain";

        const displayImageSource =
            getCacheBustedImageUrl(imageSource);

        petImage.src = displayImageSource;

        petImage.onerror = function () {
            root.style.display = "none";
            petAnchor.style.display = "none";
            hideBubble();
            setTalking(false);
        };

        if (companionName && companionInfo) {
            if (state.settings.nameEnabled) {
                companionName.style.display = "block";
                companionName.textContent =
                    state.settings.companionName;

                companionName.style.color =
                    state.settings.nameColor;

                companionName.style.fontSize =
                    state.settings.nameFontSize + "px";

                companionName.style.setProperty(
                    "position",
                    getComputedStyle(companionName).position === "static"
                        ? "relative"
                        : getComputedStyle(companionName).position
                );

                companionName.style.setProperty(
                    "top",
                    "-" + state.settings.nameGap + "px",
                    "important"
                );

                companionName.style.setProperty(
                    "margin-top",
                    "0px",
                    "important"
                );
            } else {
                companionName.style.display = "none";
            }
        }

        if (petShadow) {
            petShadow.style.display =
                state.settings.shadowEnabled ? "block" : "none";

            petShadow.style.width = "100%";
            petShadow.style.height = "100%";
            petShadow.style.objectFit = "contain";

            petShadow.style.filter =
                "brightness(0) blur(" +
                state.settings.shadowBlur +
                "px)";

            petShadow.style.opacity =
                String(state.settings.shadowOpacity);

            petShadow.style.transform =
                "translateY(" +
                state.settings.shadowOffsetY +
                "px) scale(" +
                state.settings.shadowScaleX +
                ", " +
                state.settings.shadowScaleY +
                ")";

            petShadow.src = displayImageSource;

            petShadow.onerror = function () {
                petShadow.style.display = "none";
            };
        }

        if (companionBubble) {
            companionBubble.style.background =
                state.settings.bubbleBackground;

            companionBubble.style.color =
                state.settings.bubbleTextColor;

            companionBubble.style.borderColor =
                state.settings.bubbleBorderColor;

            companionBubble.style.fontSize =
                state.settings.bubbleFontSize + "px";

            companionBubble.style.maxWidth =
                state.settings.bubbleMaxWidth + "px";

            companionBubble.style.setProperty(
                "position",
                getComputedStyle(companionBubble).position === "static"
                    ? "relative"
                    : getComputedStyle(companionBubble).position
            );

            companionBubble.style.setProperty(
                "top",
                "-" + state.settings.bubbleGap + "px",
                "important"
            );

            companionBubble.style.setProperty(
                "margin-bottom",
                "0px",
                "important"
            );
        }

        updateBubblePosition();
    }

    // ============================================================
    // BUBBLE
    // ============================================================

    function hideBubble() {
        if (!companionBubble) return;
        if (state.bubbleTimer) {
            clearTimeout(state.bubbleTimer);
            state.bubbleTimer = null;
        }
        companionBubble.classList.add("hidden");
        companionBubble.style.display = "none";
        if (bubbleText) bubbleText.textContent = "";
    }

    function showBubble(text, durationSec) {
        if (!companionBubble || !bubbleText) return;
        const cleaned = cleanBubbleText(text);
        if (!cleaned) {
            hideBubble();
            return;
        }

        let displayText = cleaned;
        if (state.settings.maxBubbleCharacters > 0 && displayText.length > state.settings.maxBubbleCharacters) {
            displayText = displayText.substring(0, state.settings.maxBubbleCharacters).trimEnd() + "…";
        }

        bubbleText.textContent = displayText;
        companionBubble.classList.remove("hidden");
        companionBubble.style.display = "block";

        if (state.bubbleTimer) clearTimeout(state.bubbleTimer);
        const duration = Number.isFinite(durationSec) ? durationSec : state.settings.bubbleDurationSec;
        state.bubbleTimer = setTimeout(function () { hideBubble(); }, Math.max(0.1, duration) * 1000);
    }

    function setTalking(value) {
        state.talking = Boolean(value);
        if (companion) companion.classList.toggle("talking", state.talking);
    }

    // ============================================================
    // VARIABLES
    // ============================================================

    function replaceVariables(template, context) {
        let result = String(template || "");
        const values = {
            value: context.value || "",
            user: context.user || "",
            username: context.username || "",
            bot: context.bot || "",
            message: context.message || ""
        };

        Object.keys(values).forEach(function (key) {
            const expression = new RegExp("\\{" + key + "\\}", "gi");
            result = result.replace(expression, String(values[key] || ""));
        });
        return result;
    }

    // ============================================================
    // TTS
    // ============================================================

    async function playSpeech(text) {
        if (!state.settings.ttsEnabled || !audio) return false;
        if (!state.apiToken) return false;

        let cleanedText = cleanForTTS(text);
        if (!cleanedText) return false;

        if (cleanedText.length > 490) {
            cleanedText = cleanedText.substring(0, 490);
        }

        const url = new URL("https://api.streamelements.com/kappa/v2/speech");
        url.searchParams.set("voice", state.settings.ttsVoice);
        url.searchParams.set("text", cleanedText);
        url.searchParams.set("key", state.apiToken);

        if (state.currentObjectUrl) {
            try { URL.revokeObjectURL(state.currentObjectUrl); } catch (error) {}
            state.currentObjectUrl = null;
        }

        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {}

        audio.src = url.toString();
        audio.volume = state.settings.ttsVolume;

        try {
            await audio.play();
            setTalking(true);
            return true;
        } catch (error) {
            setTalking(false);
            return false;
        }
    }

    function enqueueSpeech(text, meta) {
        const cleanText = cleanBubbleText(text);
        if (!cleanText) return;
        if (state.speechQueue.length >= state.settings.queueLimit) return;
        state.speechQueue.push({ text: cleanText, meta: meta || {} });
        processSpeechQueue();
    }

    async function processSpeechQueue() {
        if (state.processingQueue) return;
        state.processingQueue = true;

        try {
            while (state.speechQueue.length > 0) {
                const item = state.speechQueue.shift();
                if (!state.settings.enabled || !resolveImageSource(state.settings.petImage)) continue;

                const played = await playSpeech(item.text);
                showBubble(item.text, state.settings.bubbleDurationSec);

                if (played) {
                    await new Promise(function (resolve) {
                        function onAudioEnd() {
                            if (audio) {
                                audio.removeEventListener("ended", onAudioEnd);
                                audio.removeEventListener("error", onAudioEnd);
                                audio.removeEventListener("pause", onAudioEnd);
                            }
                            resolve();
                        }
                        if (audio) {
                            audio.addEventListener("ended", onAudioEnd);
                            audio.addEventListener("error", onAudioEnd);
                            audio.addEventListener("pause", onAudioEnd);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    await wait(Math.max(1000, state.settings.bubbleDurationSec * 1000));
                }

                setTalking(false);
                await wait(400);
            }
        } finally {
            state.processingQueue = false;
        }
    }

    function stopAudio() {
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {}
        }
        setTalking(false);
    }

    // ============================================================
    // RANDOM SPEECH & GREETINGS
    // ============================================================

    function scheduleRandomSpeech() {
        if (state.randomSpeechTimer) { clearTimeout(state.randomSpeechTimer); state.randomSpeechTimer = null; }
        if (!state.loaded || !state.settings.enabled || !state.settings.randomSpeechEnabled || !resolveImageSource(state.settings.petImage) || !state.settings.randomLines.length) return;

        let min = state.settings.randomSpeechMinSec;
        let max = state.settings.randomSpeechMaxSec;
        if (max < min) { const temp = min; min = max; max = temp; }

        const delay = (min + Math.random() * (max - min)) * 1000;
        state.randomSpeechTimer = setTimeout(function () {
            const line = randomItem(state.settings.randomLines);
            if (line) {
                enqueueSpeech(replaceVariables(line, { value: "", user: "", username: "", bot: "", message: "" }), { type: "random" });
            }
            scheduleRandomSpeech();
        }, delay);
    }

    function handleGreeting(data) {
        if (!state.settings.greetingEnabled) return false;

        const now = Date.now();
        if (state.greetingCooldownUntil > 0 && now < state.greetingCooldownUntil) {
            return false;
        }

        const message = normalizeForComparison(data.message);
        const triggers = state.settings.greetingTriggers || [];
        const matched = triggers.some(function(trigger) {
            return normalizeForComparison(trigger) === message;
        });

        if (!matched) return false;

        let responsesRaw = state.settings.greetingResponses || [];
        let responses = [];

        for (let i = 0; i < responsesRaw.length; i++) {
            const parts = String(responsesRaw[i]).split("|");
            for (let p = 0; p < parts.length; p++) {
                const part = parts[p].trim();
                if (part) responses.push(part);
            }
        }

        if (!responses.length) return true;

        const responseTemplate = responses[Math.floor(Math.random() * responses.length)];
        if (!responseTemplate) return true;

        const senderName = data.displayName || data.username || data.nick || "Viewer";
        const finalText = replaceVariables(responseTemplate, {
            value: "",
            user: senderName,
            username: data.username || data.nick || "",
            bot: "",
            message: data.message || ""
        });

        const cooldownSec = Math.max(0, Number(state.settings.greetingCooldownSec) || 0);
        state.greetingCooldownUntil = now + (cooldownSec * 1000);

        enqueueSpeech(finalText, { type: "greeting", user: senderName });
        return true;
    }

    function handleGlobalCommand(data) {
        if (!state.settings.commandEnabled || !isViewerMessage(data)) return false;
        const configuredCommand = state.settings.command.trim().toLowerCase();
        if (!configuredCommand) return false;

        const incomingText = String(data.message || "").trim().toLowerCase();
        if (incomingText !== configuredCommand && !incomingText.startsWith(configuredCommand + " ")) {
            return false;
        }

        const line = randomItem(state.settings.randomLines);
        if (line) {
            enqueueSpeech(replaceVariables(line, {
                value: "", user: data.displayName || data.username || data.nick || "", username: data.username || data.nick || "", bot: "", message: data.message || ""
            }), { type: "command" });
        }
        return true;
    }

    // ============================================================
    // MATCHERS & PENDING
    // ============================================================

    function matchAfterRule(rule, message) {
        if (!rule.start) return null;
        const messageText = String(message || "");
        if (messageText.substring(0, rule.start.length).toLowerCase() !== rule.start.toLowerCase()) return null;
        return { value: messageText.substring(rule.start.length).trim() };
    }

    function matchBetweenRule(rule, message) {
        if (!rule.start || !rule.end) return null;
        const messageText = String(message || "");
        const lowerMessage = messageText.toLowerCase();
        const lowerStart = rule.start.toLowerCase();
        const lowerEnd = rule.end.toLowerCase();
        if (!lowerMessage.startsWith(lowerStart)) return null;
        const startIndex = rule.start.length;
        const endIndex = lowerMessage.indexOf(lowerEnd, startIndex);
        if (endIndex === -1) return null;
        return { value: messageText.substring(startIndex, endIndex).trim() };
    }

    function matchExactRule(rule, message) {
        if (!rule.exact) return null;
        if (normalizeForComparison(message) !== normalizeForComparison(rule.exact)) return null;
        return { value: String(message || "").trim() };
    }

    function isValidCustomCommand(command) {
        return /^![a-z0-9][a-z0-9_-]*$/i.test(
            String(command || "").trim()
        );
    }
    function cleanupPendingCommands() {
        const now = Date.now();
        state.pendingCommands = state.pendingCommands.filter(function (pending) { return pending.expiresAt > now; });
    }

    function addPendingCommand(rule, data, command) {
        cleanupPendingCommands();
        const username = normalizeForComparison(data.username || data.nick || data.displayName || "");
        const bot = normalizeForComparison(rule.bot);
        const normalizedCommand = normalizeForComparison(command);
        const exists = state.pendingCommands.some(function (pending) { return pending.username === username && pending.bot === bot && pending.command === normalizedCommand; });
        if (exists) return false;

        state.pendingCommands.push({
            ruleIndex: rule.index,
            username: username,
            displayName: data.displayName || data.username || data.nick || "",
            bot: bot,
            command: normalizedCommand,
            expiresAt: Date.now() + state.settings.commandTimeoutSec * 1000
        });
        return true;
    }

    function consumePendingCommandForBot(rule, data) {
        cleanupPendingCommands();
        const sender = normalizeForComparison(data.displayName || data.username || data.nick || "");
        const ruleBot = normalizeForComparison(rule.bot);
        if (!ruleBot || !sender || sender !== ruleBot) return null;

        for (let i = 0; i < state.pendingCommands.length; i++) {
            const pending = state.pendingCommands[i];
            if (pending.ruleIndex !== rule.index) continue;
            state.pendingCommands.splice(i, 1);
            return pending;
        }
        return null;
    }

    // ============================================================
    // CUSTOM RESPONSES HANDLER
    // ============================================================

    function handleCustomResponses(data) {
        const message = String(data.message || "");
        if (!message) return false;

        let handled = false;
        const sender = data.displayName || data.username || data.nick || "";

        for (let i = 0; i < state.customResponses.length; i++) {
            const rule = state.customResponses[i];
            if (!rule.enabled || rule.mode !== "COMMAND" || !rule.bot) continue;
            const pending = consumePendingCommandForBot(rule, data);
            if (!pending) continue;

            let responseText = "";
            if (rule.ignore) {
                responseText = message;
            } else {
                responseText = replaceVariables(rule.response || "{value}", {
                    value: message, user: pending.displayName, username: pending.username, bot: sender, message: message
                });
            }

            if (responseText) enqueueSpeech(responseText, { type: "custom-command", rule: rule.index });
            handled = true;
        }

        if (isViewerMessage(data)) {
            for (let i = 0; i < state.customResponses.length; i++) {
                const rule = state.customResponses[i];
                if (!rule.enabled || rule.mode !== "COMMAND" || !rule.bot) continue;
                
                const command = rule.command.trim();
                if (!isValidCustomCommand(command)) continue;
                
                const incomingText = message.trim().toLowerCase();
                const targetCommand = command.toLowerCase();
                
                if (incomingText !== targetCommand && !incomingText.startsWith(targetCommand + " ")) {
                    continue;
                }
                
                addPendingCommand(rule, data, command);
                handled = true;
            }
        }

        for (let i = 0; i < state.customResponses.length; i++) {
            const rule = state.customResponses[i];
            if (!rule.enabled || rule.mode === "COMMAND") continue;

            if (rule.bot) {
                if (normalizeForComparison(sender) !== normalizeForComparison(rule.bot)) continue;
            } else {
                if (!isViewerMessage(data)) continue;
            }

            let match = null;
            if (rule.mode === "AFTER") match = matchAfterRule(rule, message);
            else if (rule.mode === "BETWEEN") match = matchBetweenRule(rule, message);
            else if (rule.mode === "EXACT") match = matchExactRule(rule, message);

            if (!match) continue;

            let responseText = "";
            if (rule.ignore) {
                responseText = message;
            } else {
                responseText = replaceVariables(rule.response || "{value}", {
                    value: match.value, user: data.displayName || data.username || data.nick || "", username: data.username || data.nick || "", bot: sender, message: message
                });
            }

            if (responseText) enqueueSpeech(responseText, { type: "custom", rule: rule.index });
            handled = true;
        }

        return handled;
    }

    // ============================================================
    // CHAT ENGINE
    // ============================================================

    function extractMessageData(eventData) {
        if (!eventData || !eventData.data) {
            return null;
        }

        const payload = eventData.data;

        const message = String(
            payload.text ||
            payload.message ||
            ""
        ).trim();

        return {
            message: message,

            username: String(
                payload.username ||
                payload.nick ||
                ""
            ),

            displayName: String(
                payload.displayName ||
                payload.username ||
                payload.nick ||
                "Viewer"
            ),

            nick: String(
                payload.nick ||
                payload.username ||
                ""
            ),

            isBot: Boolean(payload.isBot),

            raw: payload
        };
    }
    function handleChatMessage(eventData) {
        const data = extractMessageData(eventData);

        if (!data) return;

        if (!data.message) return;

        /*
        * Bot responses must remain untouched so custom responses
        * can receive and speak the full bot message.
        */
        if (!isViewerMessage(data)) {
            handleCustomResponses(data);
            return;
        }

        /*
        * Viewer messages use the configurable maximum length.
        */
        const viewerData = {
            ...data,
            message: data.message
        };

        const maxCharacters =
            Number(state.settings.maxMessageCharacters) || 0;

        if (
            maxCharacters > 0 &&
            viewerData.message.length > maxCharacters
        ) {
            viewerData.message = viewerData.message.substring(
                0,
                maxCharacters
            );
        }

        if (!viewerData.message.trim()) return;

        handleCustomResponses(viewerData);
        handleGlobalCommand(viewerData);
        handleGreeting(viewerData);
    }
    // ============================================================
    // HELP & INIT
    // ============================================================

    function createHelpPanel() {
        const existing =
            document.getElementById("ciga-companion-help");

        if (existing) {
            existing.remove();
        }

        if (!state.settings.showHelpTips) {
            return;
        }

        const help = document.createElement("div");

        help.id = "ciga-companion-help";

        help.style.position = "fixed";
        help.style.left = "20px";
        help.style.top = "20px";

        help.style.width = "auto";
        help.style.maxWidth = "460px";

        help.style.padding = "16px";

        help.style.borderRadius = "12px";
        help.style.boxSizing = "border-box";

        help.style.background =
            "rgba(0, 0, 0, 0.92)";

        help.style.color = "#ffffff";

        help.style.fontFamily =
            "Arial, sans-serif";

        help.style.fontSize = "14px";
        help.style.lineHeight = "1.5";

        help.style.zIndex = "2147483647";

        help.style.display = "block";
        help.style.visibility = "visible";
        help.style.opacity = "1";

        help.style.pointerEvents = "none";

        help.style.textAlign = "left";

        help.innerHTML = `
            <div style="
                font-weight:700;
                font-size:18px;
                margin-bottom:10px;
            ">
                CIGA Companion — Help Guide
            </div>

            <div style="
                margin-bottom:12px;
            ">
                ${escapeHtml(
                    state.settings.helpNotice ||
                    "Remember to save your changes before testing the widget."
                )}
            </div>

            <div style="margin-bottom:8px;">
                <b>AFTER</b> — responds when a message starts with the configured Start Text.
            </div>

            <div style="margin-bottom:8px;">
                <b>BETWEEN</b> — captures text between the configured Start Text and End Text.
            </div>

            <div style="margin-bottom:8px;">
                <b>COMMAND</b> — waits for the configured bot to answer a viewer command.
            </div>

            <div style="margin-bottom:8px;">
                <b>EXACT</b> — responds when the whole chat message matches exactly.
            </div>

            <div style="margin-bottom:8px;">
                <b>Variables:</b>
                {user}, {username}, {value}, {bot}, {message}
            </div>

            <div>
                <b>Bubble</b> shows the response text.
                <b>TTS</b> speaks the cleaned version of that text.
            </div>
        `;

        document.body.appendChild(help);
    }

function updateBubblePosition() {
    if (!petAnchor) return;

    if (companionName) {
        if (state.settings.nameEnabled) {
            companionName.style.setProperty(
                "position",
                getComputedStyle(companionName).position === "static"
                    ? "relative"
                    : getComputedStyle(companionName).position
            );

            companionName.style.setProperty(
                "top",
                "-" + state.settings.nameGap + "px",
                "important"
            );

            companionName.style.setProperty(
                "margin-top",
                "0px",
                "important"
            );
        } else {
            companionName.style.display = "none";
        }
    }

    if (companionBubble) {
        companionBubble.style.setProperty(
            "position",
            getComputedStyle(companionBubble).position === "static"
                ? "relative"
                : getComputedStyle(companionBubble).position
        );

        companionBubble.style.setProperty(
            "top",
            "-" + state.settings.bubbleGap + "px",
            "important"
        );

        companionBubble.style.setProperty(
            "margin-bottom",
            "0px",
            "important"
        );
    }
}

    window.addEventListener("onWidgetLoad", function (obj) {
        try {
            const detail = obj && obj.detail ? obj.detail : {};
            const fieldData = detail.fieldData || {};
            const channel = detail.channel || {};
            
            state.fieldData = fieldData;
            state.apiToken = String(channel.apiToken || "");
            
            readSettings(fieldData);
            buildCustomResponses(fieldData);
            applyVisualSettings();
            createHelpPanel();
            
            state.loaded = true;
            scheduleRandomSpeech();
            setTimeout(function () { updateBubblePosition(); }, 100);
        } catch (error) {}
    });

    window.addEventListener("onEventReceived", function (obj) {
        try {
            const detail = obj && obj.detail ? obj.detail : {};
            if (detail.listener !== "message") return;
            handleChatMessage(detail.event || {});
        } catch (error) {}
    });

    window.addEventListener("beforeunload", function () {
        if (state.randomSpeechTimer) clearTimeout(state.randomSpeechTimer);
        if (state.bubbleTimer) clearTimeout(state.bubbleTimer);
        stopAudio();
        if (state.currentObjectUrl) {
            try { URL.revokeObjectURL(state.currentObjectUrl); } catch (error) {}
        }
    });

})();
