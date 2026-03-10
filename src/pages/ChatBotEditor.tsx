import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ChatBotEditor() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      navigate("/chatbot-maker", { replace: true, state: { tab: "builder", projectId: id } });
    } else {
      navigate("/chatbot-maker", { replace: true, state: { tab: "overview", openWizard: true } });
    }
  }, [id, navigate]);

  return null;
}

