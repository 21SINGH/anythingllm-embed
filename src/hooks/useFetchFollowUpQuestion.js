import { useState } from "react";
import BrandService from "@/models/brandService";

export default function useFetchFollowUpQuestion(
  embedSettings,
  nudgeText,
  sessionId
) {
  const [followUpQuestions, setFollowUpQuestions] = useState(null);

  const fetchFollowUpQuestion = async (text = nudgeText) => {
    if (!embedSettings?.host || !text || !sessionId) {
      return null;
    }

    try {
      const followUpQuestion = await BrandService.generateFollowUpQuestion(
        embedSettings.host,
        text,
        sessionId
      );
      setFollowUpQuestions(followUpQuestion);

      return followUpQuestion;
    } catch (error) {
      return null;
    }
  };

  return { fetchFollowUpQuestion, followUpQuestions };
}
