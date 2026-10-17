import { AIReply } from "./AIReply";
import { useEffect, useRef, useState } from "react";
import { Text } from "@/components/Typography";
import { Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { chatBase, requestChatAPI } from "@/lib/api";
import type { TrekChatContext } from "@/services/routing/ai-context";
import { colors } from "@/theme/tokens";
export function RouteAssistant({
  context,
  email,
}: {
  context: TrekChatContext;
  email: string | null;
}) {
  const [question, setQuestion] = useState(""),
    [reply, setReply] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function ask() {
    if (lock.current || !question.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestChatAPI(
        [{ role: "user", content: question.trim() }],
        email,
        context,
      );
      if (alive.current) {setReply(result.reply);setSource(result.source === "nemotron" ? "Nemotron · based on supplied route data" : result.source === "safety-rule" ? "Navo safety guidance · not an AI completion" : "Navo response");}
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error ? failure.message : "Navo AI could not answer. Please retry.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Card>
      <SectionTitle title="Ask Navo about this route" />
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
        Send this route’s names, distance, estimated timing, the first twelve mapped directions and available
        progress to Navo AI. Raw GPS coordinates and recorded paths are
        excluded. Available point forecasts and daylight times are included with their
        source and fetch time. Unknown weather stays unavailable.
      </Text>
      {!chatBase ? (
        <Notice
          tone="info"
          message="Route guidance from AI is available when the Navo backend is connected. Your map and GPS flow work independently."
        />
      ) : (
        <>
          <Field
            label="Your question"
            value={question}
            onChangeText={setQuestion}
            placeholder="How much longer? What should I consider?"
            maxLength={2000}
            editable={!busy}
          />
          <Button
            label="Ask about this route"
            disabled={busy || !question.trim()}
            busy={busy}
            onPress={() => void ask()}
          />
        </>
      )}
      <Notice message={error} />
      {Boolean(reply) && <Text style={{color:colors.lime,fontSize:13,marginTop:12}}>{source}</Text>}
      {Boolean(reply) && (
        <AIReply content={reply} style={{ color: colors.ink, fontSize: 16, lineHeight: 25, marginTop: 8 }} />
      )}
    </Card>
  );
}
