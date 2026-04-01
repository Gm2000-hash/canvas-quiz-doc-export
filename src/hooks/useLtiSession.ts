import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LtiSession {
  sessionId: string;
  activityId: string;
}

/**
 * Hook to detect LTI launches and post scores back to Canvas.
 * Reads ?lti_session= from URL params.
 */
export function useLtiSession() {
  const [searchParams] = useSearchParams();
  const [ltiSession, setLtiSession] = useState<LtiSession | null>(null);
  const [scorePosted, setScorePosted] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("lti_session");
    if (sessionId) {
      setLtiSession({ sessionId, activityId: "" });
    }
  }, [searchParams]);

  const postScore = useCallback(async (score: number, maxScore: number = 100, activityId?: string) => {
    if (!ltiSession || posting || scorePosted) return;

    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("lti-score", {
        body: {
          sessionId: ltiSession.sessionId,
          score,
          maxScore,
          activityId,
        },
      });

      if (error) {
        console.error("LTI score post error:", error);
      } else {
        setScorePosted(true);
        console.log("LTI score result:", data);
      }
    } catch (err) {
      console.error("LTI score post failed:", err);
    } finally {
      setPosting(false);
    }
  }, [ltiSession, posting, scorePosted]);

  return {
    isLtiLaunch: !!ltiSession,
    ltiSession,
    postScore,
    scorePosted,
    posting,
  };
}
