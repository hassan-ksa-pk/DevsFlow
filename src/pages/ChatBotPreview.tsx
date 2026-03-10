import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ChatBotPreview() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      // BotForge keeps preview inside the Builder tab.
      navigate("/chatbot-maker", { replace: true, state: { tab: "builder", projectId: id } });
    } else {
      navigate("/chatbot-maker", { replace: true, state: { tab: "overview" } });
    }
  }, [id, navigate]);

  return null;
}

