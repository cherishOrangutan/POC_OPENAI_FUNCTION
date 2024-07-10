// src/components/Message.tsx
import React, { Fragment } from "react";
import { MessageDto } from "../models/MessageDto";

interface MessageProps {
  message: MessageDto;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div style={{ textAlign: message.isUser ? "right" : "left", margin: "8px" }}>
      <div
        style={{
          color: message.isUser ? "#ffffff" : "#000000",
          backgroundColor: message.isUser ? "#1186fe" : "#eaeaea",
          padding: "15px",
          borderRadius: "8px",
        }}
      >
        {message.content.split("\n").map((text, index) => (
          <Fragment key={index}>
            {text}
            <br />
          </Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {message.images.map((image, index) => (
            <img key={index} src={image} alt='' style={{ marginBottom: '2px' }} />
        ))}
      </div>
    </div>
  );
};

export default Message;