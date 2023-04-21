import HomePage from "../pages/HomePage";
import ColorMode from "@/models/ColorMode";

const IndexPage: React.FC<{ colorMode: ColorMode }> = ({ colorMode }) => {
  return <HomePage colorMode={colorMode} />;
};

export default IndexPage;
