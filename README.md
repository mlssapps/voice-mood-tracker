# Voice Mood Tracker

Private one-minute voice check-ins that track **anxiety** and **low-mood** signals over time. Everything runs on your own device: your recording is analyzed on the phone and then discarded. Only the scores, your optional self-ratings, and notes are saved, in the app only.

**Not a medical device.** This is a personal tracking and research tool. It can't diagnose anything. Diagnosis and treatment need a doctor or licensed clinician. If you're struggling, call or text 988 (US) or text HOME to 741741.

## With gratitude to Kintsugi Health

This app runs the **DAM 3.1 Depression and Anxiety Model** by [Kintsugi Health](https://kintsugihealth.com), released openly under the Apache License 2.0 after years of work. Thank you to the team and to everyone whose voices made it possible.

- Original model: KintsugiHealth/dam (a copy is kept at [mlssapps/voice-model](https://github.com/mlssapps/voice-model))
- Changes made here: the LoRA adapter was merged into the weights and the model was exported to ONNX and stored in half precision (float16), split into 24 MB parts (`dam-fp16.part00`–`part14`). Scores match the original PyTorch model within 0.001. The audio preprocessing (`featex.js`) is a JavaScript port of the original `featex.py` and Whisper's log-mel features, matching within 0.00005.
- Base model: OpenAI Whisper-small.en (MIT License).
- Runtime: [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.22 (MIT License).

## What the research supports

In an independent study the model separated depressed from non-depressed speakers with an AUC of about 0.71 (0.5 = chance), with lower accuracy in some groups such as pregnant women. It was trained mostly on American English. Single readings are noisy; trends over many check-ins are more meaningful.

Made by MLSS.
