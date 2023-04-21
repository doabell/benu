import HomePage from "../pages/HomePage";
import React from "react";

const IndexPage: React.FC<{ setMode: React.Dispatch<React.SetStateAction<"light" | "dark">> }> = ({ setMode }) => {
  return <HomePage setMode={setMode} />;
};

export default IndexPage;
