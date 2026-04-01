client<llm> MyClient {
  provider openai
  options {
    base_url "https://api.openai.com/v1" // Giá trị mặc định, sẽ bị override bởi Python
    api_key "PLACEHOLDER"              // Sẽ bị override bởi Python
    model "gpt-4o"                     // Sẽ bị override bởi Python
  }
}
