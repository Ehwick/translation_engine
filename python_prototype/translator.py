from openai import OpenAI

DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

LANGUAGES = [
    "Auto-detect",
    "English",
    "Spanish",
    "French",
    "German",
    "Italian",
    "Portuguese",
    "Dutch",
    "Russian",
    "Chinese (Simplified)",
    "Chinese (Traditional)",
    "Japanese",
    "Korean",
    "Arabic",
    "Hindi",
    "Turkish",
    "Polish",
    "Swedish",
    "Danish",
    "Norwegian",
    "Finnish",
    "Greek",
    "Hebrew",
    "Czech",
    "Romanian",
    "Hungarian",
    "Ukrainian",
    "Vietnamese",
    "Thai",
    "Indonesian",
]


class Translator:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)

    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        if not text.strip():
            return ""

        source_desc = (
            "the source language (detect it automatically)"
            if source_lang == "Auto-detect"
            else source_lang
        )
        system_prompt = (
            f"You are a professional literary translator. Translate the user's text from "
            f"{source_desc} to {target_lang}. Preserve paragraph breaks and formatting as "
            f"closely as possible. Output only the translated text, with no commentary, "
            f"notes, or explanations."
        )

        response = self.client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
