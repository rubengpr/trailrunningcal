import OpenAI from 'openai';
const client = new OpenAI();

const response = await client.responses.create({
  model: 'gpt-5-mini-2025-08-07',
  tools: [{ type: 'web_search' }],
  instructions:
    'Return always a Spanish, structured, concise output containing just the following info: event main name, date (YYYY-MM-DD), location (city, province), description of 100 characthers maximum. Search for information only inside the provided website (routes included). Do not visit or fetch information from other sources',
  input: 'https://cursadelsmussols.cat/',
});

console.log(response.output_text); //Render response (plain text)
