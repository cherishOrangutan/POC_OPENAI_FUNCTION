// src/components/Chat.tsx
import SendIcon from "@mui/icons-material/Send";
import { Button, CircularProgress, Container, Grid, LinearProgress, TextField } from "@mui/material";
import axios from "axios";
import OpenAI from "openai";
import React, { useEffect, useState } from "react";
import { MessageDto } from "../models/MessageDto";
import Message from "./Message";

const Chat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(new Array<MessageDto>());
  const [input, setInput] = useState<string>("");
  const [assistant, setAssistant] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [openai, setOpenai] = useState<any>(null);
  const [run, setRun] = useState<any>(null);

  useEffect(() => {
    initChatBot();
  }, []);

  useEffect(() => {
    setMessages([
      {
        content: "Hi, I'm your personal assistant. How can I help you?",
        isUser: false,
        images: []
      },
    ]);
  }, [assistant]);

  const initChatBot = async () => {
    const openai = new OpenAI({
      apiKey: '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',
      dangerouslyAllowBrowser: true,
    });

    // Create an assistant
    const assistant = await openai.beta.assistants.create({
      name: "AstroKid",
      instructions: "You are a astrologer in India. You love to help clients when they are in need. Your readings are spirit-guided and you work according to Astrology ethics to bring stability in the lives of the people. However, your main motive is to give user clarity and insight regarding their's life and also to empower user with the spiritual knowledge of different energies that are revolving around us. Apart from this, you can also be contacted regarding Marriage Consultation, Career and Business, Love and Relationship, Wealth and Property, Career issues and much more. The remedies you provide are very easy and effective and are proven to be accurate most of the time. Moreover, your customers are always satisfied with your solutions and remedies. You treat all your customers on a personal level and tries to build a relationship with them.",
      tools: [
        { 
            type: "code_interpreter" 
        },
        {
            type: 'function',
            function: {
            name: 'fetchCricketPlayerInfoFromApi',
            description: 'Fetch the cricket player info by keyword using API',
            parameters: {
                type: 'object',
                properties: {
                    playerName: {
                        type: 'string',
                        description:
                        'The playerName, e.g., Sachin Tendulkar, Virat Kholi, MS Dhoni, etc.',
                    },
                },
                required: ['playerName'],
            },
            },
        },
     ],
      model: "gpt-4-turbo",
    });

    // Create a thread
    const thread = await openai.beta.threads.create();

    setOpenai(openai);
    setAssistant(assistant);
    setThread(thread);
  };

  const createNewMessage = (content: string, isUser: boolean, images: string[]) => {
    const newMessage = new MessageDto(isUser, content, images);
    return newMessage;
  };

  const handleSendMessage = async () => {
    messages.push(createNewMessage(input, true, []));
    setMessages([...messages]);
    setInput("");

    // Send a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: input,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Create a response
    let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    // setRun(response);
    console.log('response.status', response.status);

    // Wait for the response to be ready
    while (response?.status === "in_progress" || response?.status === "queued" || response?.status === "requires_action") {
      console.log("waiting...");
      console.log('response.status_1', response.status);
      console.log('run', run.id);
      setIsWaiting(true);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('response.status_2', response, new Date().toTimeString());
      setRun(response);
      console.log('run just after setRun', run);
      if(response.status === "requires_action"){
        response = await handleSubmitAction(response);
        console.log('response.status_3', response);

      }
    }

    setIsWaiting(false);

    // Get the messages for the thread
    const messageList = await openai.beta.threads.messages.list(thread.id);

    // Find the last message for the current run
    const lastMessage = messageList.data
      .filter((message: any) => message.run_id === run.id && message.role === "assistant")
      .pop();

    // Print the last message coming from the assistant
    if (lastMessage) {
      const text = lastMessage.content[0]["text"].value;
      const images = extractImageUrls(text); 
      console.log(lastMessage.content[0]["text"].value);
      setMessages([...messages, createNewMessage(lastMessage.content[0]["text"].value, false, images)]);
    }
  };

  // Example tool calls: [TSLA, MSFT, AAPL]
  // Goal: Fetch stock prices for each symbol
  //       Populate toolOutputs with all of the new stock prices [TSLA: 100, MSFT : 150, AAPL]
  //       Submit toolOutputs to the run in  a single request
  const handleSubmitAction = async (run1: any) => {
    const toolOutputs = [];
    console.log('run in handleSubmitAction', run1, new Date().toTimeString());
    for (const toolCall of run1?.required_action?.submit_tool_outputs.tool_calls ?? []) {
        console.log('toolCall', toolCall);
        if (toolCall.function.name === 'fetchCricketPlayerInfoFromApi') {
            const { playerName } = JSON.parse(toolCall.function.arguments);

            console.log('playerName', playerName);

            try {
                const response = await axios.get(`https://api.cricapi.com/v1/players`, {
                    params: {
                        apikey: '0b3af38d-c0b6-4c45-9090-66f217701335',
                        offset: 0,
                        search: playerName
                    }
                });
                console.log('1 API response', response.data);

                for (let i = 0; i < response.data.data.length; i++) {
                    const playerId = response.data.data[i].id;
                    const playerDataResponse = await axios.get(`https://api.cricapi.com/v1/players_info`, {
                        params: {
                            apikey: '0b3af38d-c0b6-4c45-9090-66f217701335',
                            id: playerId
                        }
                    });

                    const { id, stats, ...playerData } = playerDataResponse.data.data; // Using destructuring to remove `id` and `stats`

                    toolOutputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(playerData),
                    });
                }
            } catch (error) {
                console.log('Error fetching player data', error);
            }
        } else {
            throw new Error(`Unknown tool call function: ${toolCall.function.name}`);
        }
    }

    console.log('toolOutputs', toolOutputs);

    if (toolOutputs.length > 0) {
        const response = await openai.beta.threads.runs.submitToolOutputs(
            thread.id,
            run1.id,
            { tool_outputs: toolOutputs }
        );

        setRun(response);

        console.log('Response data from submit tool output', response);

        return response;
    }

    return {};
  };


  // detect enter key and send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const extractImageUrls = (text) => {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const imageUrls = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        imageUrls.push(match[1]); // Capture group 1 contains the image URL
    }

    return imageUrls;
  }

  return (
    <Container>
      <Grid container direction="column" spacing={2} paddingBottom={2}>
        {messages.map((message, index) => (
          <Grid item alignSelf={message.isUser ? "flex-end" : "flex-start"} key={index}>
            <Message key={index} message={message} />
          </Grid>
        ))}
      </Grid>
      <Grid container direction="row" paddingBottom={5} justifyContent={"space-between"}>
        <Grid item sm={11} xs={9}>
          <TextField
            label="Type your message"
            variant="outlined"
            disabled={isWaiting}
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          {isWaiting && <LinearProgress color="inherit" />}
        </Grid>
        <Grid item sm={1} xs={3}>
          <Button variant="contained" size="large" color="primary" onClick={handleSendMessage} disabled={isWaiting}>
            {isWaiting && <CircularProgress color="inherit" />}
            {!isWaiting && <SendIcon fontSize="large" />}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Chat;
