function ChatWithPlanner(messages: Message[]) -> string {
  client MyClient
  prompt #"
    {{ _.role("system") }}
    You are a professional AI Project Planner. Your role is to help the user 
    brainstorm and define their project idea clearly. Be inquisitive, helpful, 
    and structured in your responses. Use Markdown (bold, lists) to emphasize 
    important points.

    {% for msg in messages %}
    {{ _.role(msg.role) }}
    {{ msg.content }}
    {% endfor %}
  "#
}

function GenerateProjectReport(messages: Message[]) -> ProjectReport {
  client MyClient
  prompt #"
    Analyze the following conversation and generate a detailed PROJECT REPORT.

    {% for msg in messages %}
    {{ _.role(msg.role) }}
    {{ msg.content }}
    {% endfor %}

    {{ _.role("system") }}
    Output the report in the specified JSON format.
    {{ ctx.output_format }}
  "#
}
