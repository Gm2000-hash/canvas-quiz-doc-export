import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Zap, Brain, Heart, ArrowRight, RotateCcw, CheckCircle2,
  AlertCircle, BookOpen, Smartphone, Trophy, Clock,
  Users, MessageCircle, Wind, Droplets,
  Activity, ShieldAlert, Sparkles,
  Ear, Smile, ExternalLink
} from "lucide-react";

interface Choice {
  text: string;
  type: string;
  points: number;
  feedback: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  choices: Choice[];
  insight: {
    title: string;
    content: string;
    icon: React.ReactNode;
  };
}

const scenarios: Scenario[] = [
  {
    id: 1,
    title: "The Unannounced Math Quiz",
    description: "You walk into 2nd period and see 'POP QUIZ' on the board. You haven't looked at your notes since Friday. Your heart starts racing.",
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Take 3 deep 'box breaths' to lower your heart rate and ground yourself.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Amy Morin identifies relaxation strategies like deep breathing as a top-tier healthy coping skill. In a pop quiz, the situation is outside your control — you can't un-schedule it. Box breathing directly lowers your heart rate and activates your parasympathetic nervous system, which is exactly the right move when you need to manage your emotional response to an uncontrollable stressor." },
      { text: "Quickly scan your notes for 2 minutes for key formulas before the quiz starts.", type: "Problem-Focused", points: 10, feedback: "Excellent! This is textbook problem-focused coping — you are working to 'rid yourself of the stressful situation' by taking direct action. Since there is still time before the quiz, scanning notes is a practical step that addresses the root cause of your anxiety (feeling unprepared). This shows strong problem-solving instincts." },
      { text: "Roll your eyes and say 'I don't even care' to play it cool.", type: "Unhealthy/Denial", points: 0, feedback: "This is a common reaction, but it's a form of emotional avoidance. Pretending you don't care doesn't make the stress disappear — it just buries it. Amy Morin warns that suppressing emotions prevents you from developing real coping skills. Proactive alternatives: (1) Acknowledge the stress honestly and use box breathing to calm your body, (2) Use the remaining time to quickly scan your notes, or (3) Use positive self-talk: 'This is stressful, but I can handle it.'" },
      { text: "Immediately text your parent to come pick you up so you can avoid the quiz.", type: "Unhealthy/Avoidant", points: 0, feedback: "Leaving to avoid a challenge feels like relief in the moment, but Amy Morin explains that avoidance creates a pattern where stress feels more and more unmanageable over time. Every time you escape a hard situation, your brain learns 'I can't handle this,' which makes the NEXT challenge even scarier." },
      { text: "Put your head down on the desk and refuse to participate.", type: "Unhealthy/Shutdown", points: 0, feedback: "Shutting down is a stress response — your brain is going into 'freeze' mode because it feels overwhelmed. While this is understandable, it guarantees a zero and reinforces the belief that you can't handle hard things." },
      { text: "Use positive self-talk: 'I've done this before, and I can handle this challenge.'", type: "Emotion-Focused", points: 5, feedback: "This is a decent start, but it's only partially effective on its own. Positive self-talk helps manage emotional distress, but in this scenario you also have an opportunity to take action (like reviewing notes). A stronger approach would be to combine self-talk with a problem-focused strategy." },
      { text: "Stare blankly at the paper and whisper to your friend how much this sucks.", type: "Ineffective/Venting", points: 0, feedback: "Amy Morin explains that 'repeatedly venting' or focusing on the negative often keeps you stuck in a place of pain rather than moving toward a solution. You're wasting valuable time AND reinforcing your anxiety." }
    ],
    insight: { title: "Problem vs. Emotion Focused", content: "Problem-focused coping is for when you can change the situation (like studying). Emotion-focused coping is for taking care of your feelings when you can't change the circumstances (like a surprise quiz). Both are healthy and necessary!", icon: <Brain className="w-12 h-12 text-primary" /> }
  },
  {
    id: 2,
    title: "Project: Group Friction",
    description: "Your group is ignoring your suggestions for the Science project. They keep talking over you and it feels like your ideas don't matter.",
    icon: <Users className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Practice Active Listening: Listen to their ideas first, then repeat them back to show you understand.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Active Listening is essential to conflict resolution. By listening to understand (not just to respond), you build trust. When teammates feel heard, they are far more likely to reciprocate and listen to YOUR ideas." },
      { text: "Be Unbiased: Calmly point out the pros and cons of the project ideas without getting personal.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Remaining unbiased means separating the problem from the person. By objectively evaluating ideas, you model mature leadership and redirect the group toward the best solution rather than a popularity contest." },
      { text: "Say 'Fine, do whatever you want' and sit on your phone for the rest of class.", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "This is passive-aggressive avoidance. You're punishing the group by withdrawing, but you're also hurting YOUR grade and missing a chance to develop real conflict resolution skills." },
      { text: "Start arguing louder to make sure your voice is heard over theirs.", type: "Unhealthy/Escalation", points: 0, feedback: "Matching their energy by getting louder escalates the conflict instead of resolving it. Yelling doesn't make your ideas better — it just creates a power struggle." },
      { text: "Tell the teacher that your group isn't working with you so you can switch groups.", type: "Unhealthy/Avoidant", points: 0, feedback: "While it's okay to ask for help, immediately asking to leave avoids the conflict rather than resolving it. In real life you can't always switch groups. Learning to navigate difficult people is a critical life skill." },
      { text: "Use 'Effective Communication': Tell them, 'This project feels important to me, and I'd like to share an idea.'", type: "Conflict-Resolution", points: 5, feedback: "Using 'I' statements is a healthy communication tool. However, this alone may not work if the group dynamic is already combative. A stronger move: Listen to their ideas first, repeat them back, THEN share yours." },
      { text: "Take a step back: Step out for water to cool down before addressing the group again.", type: "Emotion-Focused", points: 5, feedback: "Cooling down prevents overreacting, but stepping away helps YOU without solving the group problem. When you return, you still need Active Listening or unbiased evaluation to address the real issue." }
    ],
    insight: { title: "Active Listening", content: "Instead of listening to respond, try listening to understand. When you repeat back what a teammate said, it shows you value their input, making them more likely to value yours.", icon: <Ear className="w-12 h-12 text-primary" /> }
  },
  {
    id: 3,
    title: "The Social Media Sting",
    description: "You see a photo of your friends hanging out without you. You feel a heavy pit in your stomach and a sense of rejection.",
    icon: <Smartphone className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Engage in a hobby like drawing or playing guitar to process your feelings.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Hobbies are a healthy coping mechanism that helps you 'temporarily minimize' emotional pain while you regulate. Unlike avoidance, a hobby is constructive — it gives your brain something positive to focus on." },
      { text: "Go for a walk outside to move your body and clear your head.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Physical activity is a top-tier healthy coping skill. Exercise literally changes your body chemistry — it releases endorphins and reduces cortisol." },
      { text: "Post a passive-aggressive story like 'Guess I know who my real friends are 🙃'", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "This is passive-aggressive and almost always backfires. It puts your friends on the defensive, creates public drama, and makes YOU look like the problem." },
      { text: "Screenshot the photo and send it to another friend to talk about how you were excluded.", type: "Unhealthy/Gossip", points: 0, feedback: "Spreading the situation to other people turns hurt into drama. It creates new conflicts and trust issues." },
      { text: "Keep refreshing their stories to see exactly what they are doing.", type: "Unhealthy/Avoidance", points: 0, feedback: "Digital 'doom-scrolling' actually increases your emotional distress — each refresh deepens the wound. You're feeding the pain rather than processing it." },
      { text: "List 5 things you are currently grateful for to shift your perspective.", type: "Emotion-Focused", points: 5, feedback: "Gratitude can help reframe your thinking, but on its own it risks minimizing your valid feelings. A stronger approach would be to combine gratitude with physical activity or a hobby." },
      { text: "Have Patience: Wait until tomorrow to decide if you want to text them about it.", type: "Conflict-Resolution", points: 5, feedback: "Patience is wise — reacting impulsively to social media often makes things worse. However, patience alone is passive. Combine it with an active coping strategy like going for a walk." }
    ],
    insight: { title: "Mindfulness & Gratitude", content: "Mindfulness is about staying in the 'here and now.' When you feel left out, practicing gratitude for the people who ARE there for you can help lower the intensity of your sadness.", icon: <Sparkles className="w-12 h-12 text-primary" /> }
  },
  {
    id: 4,
    title: "Basketball Bench Duty",
    description: "You and a close friend tried out for the team. You both made it, but they were chosen for the starting lineup and you were put on the bench.",
    icon: <Trophy className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Be Humble: Acknowledge that your friend worked hard and ask the coach for feedback on your game.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! This combines humility (acknowledging your friend's effort) with proactive problem-solving (asking for feedback). It manages the relationship AND takes action on the problem." },
      { text: "Practice Proactive Coping: Create a schedule to practice your shooting 3 times a week.", type: "Problem-Focused", points: 10, feedback: "Excellent! Proactive coping is about managing future obstacles by taking action today. Creating a specific practice schedule shows you're channeling disappointment into growth." },
      { text: "Start being cold to your friend because you're jealous, even though you won't admit it.", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "Jealousy is normal, but acting cold toward your friend punishes THEM for YOUR feelings. It damages the friendship without addressing the real issue." },
      { text: "Tell other teammates that the coach plays favorites.", type: "Unhealthy/Gossip", points: 0, feedback: "Spreading negativity doesn't improve your skills and poisons the team environment. If the coach finds out, it guarantees you'll stay on the bench even longer." },
      { text: "Assume the coach is 'biased' and stop trying hard in practice.", type: "Unhealthy/Avoidant", points: 0, feedback: "Assuming bias without evidence prevents you from identifying the real problem. Giving up in practice guarantees you'll stay on the bench." },
      { text: "Keep an Optimistic Mindset: Congratulate your friend and focus on improving.", type: "Conflict-Resolution", points: 5, feedback: "Optimism is healthy, but without a concrete plan for improvement, this can become passive acceptance. Congratulate your friend AND ask the coach for specific feedback." },
      { text: "Listen to music that makes you feel empowered before the next practice.", type: "Emotion-Focused", points: 5, feedback: "Music can help manage your emotional state, but it's temporary — it doesn't improve your skills. Use it as a warm-up, then pair it with a concrete action plan." }
    ],
    insight: { title: "Humility and Growth", content: "Being humble doesn't mean being weak. It means being mature enough to celebrate others' success while working on your own improvement. This is a key leadership skill!", icon: <Smile className="w-12 h-12 text-primary" /> }
  },
  {
    id: 5,
    title: "The Overslept Panic",
    description: "You woke up 20 minutes late and missed the bus. Your parents are already at work and you feel like the day is ruined.",
    icon: <Clock className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Immediately check public transport or call a neighbor for a ride.", type: "Problem-Focused", points: 10, feedback: "Excellent! This is direct problem-focused coping — you are taking immediate action to eliminate the source of the stress." },
      { text: "Lie in bed scrolling TikTok telling yourself you'll get up 'in a minute.'", type: "Unhealthy/Avoidant", points: 0, feedback: "Procrastination disguised as coping. Every minute you scroll makes the situation worse. You're turning 20 minutes late into an hour late." },
      { text: "Text your friend to skip school together so you don't feel alone about it.", type: "Unhealthy/Peer Influence", points: 0, feedback: "Dragging someone else into your problem normalizes avoidance. Now you've created consequences for TWO people." },
      { text: "Start crying and call your mom at work, panicking about how your day is ruined.", type: "Unhealthy/Catastrophizing", points: 0, feedback: "Missing a bus is a solvable problem, not a crisis. Catastrophic thinking amplifies stress far beyond the actual situation." },
      { text: "Use positive self-talk: 'One mistake doesn't define my whole day. I can figure this out.'", type: "Emotion-Focused", points: 5, feedback: "Self-talk can help stop an emotional spiral, but you need action more than affirmation. Combine it with immediate problem-solving." },
      { text: "Go back to sleep since you're already late; what's the point?", type: "Unhealthy/Avoidant", points: 0, feedback: "This creates much bigger problems — unexcused absences, missed work, and a pattern of giving up when things go wrong." }
    ],
    insight: { title: "The Physical Connection", content: "Disruptions in behaviors like sleep and hydration are often the first signs that something is wrong. Taking care of your body is taking care of your mind.", icon: <Droplets className="w-12 h-12 text-primary" /> }
  },
  {
    id: 6,
    title: "The Class Chaos",
    description: "The class is being disrespectful to a substitute. The noise is overwhelming, and the teacher is starting to blame everyone, including you.",
    icon: <ShieldAlert className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Remaining Unbiased: Calmly ask your neighbors to quiet down so everyone can finish the work.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! You are demonstrating leadership by focusing on the task rather than the social drama. Staying focused on the goal regardless of what others are doing shows maturity." },
      { text: "Establish Boundaries: Put in earbuds (if allowed) to focus and tune out the noise.", type: "Problem-Focused", points: 10, feedback: "Excellent! Establishing boundaries is healthy — you're taking control of what you CAN control (your own focus) rather than trying to control the entire class." },
      { text: "Pull out your phone under the desk since the sub can't control the class anyway.", type: "Unhealthy/Disengagement", points: 0, feedback: "Just because the class is chaotic doesn't mean YOUR learning has to stop. Using the chaos as an excuse to check out is avoidance." },
      { text: "Record the chaos on your phone to post later because it's 'funny.'", type: "Unhealthy/Escalation", points: 0, feedback: "Recording without consent can have serious consequences. You're contributing to the problem by treating the situation as entertainment." },
      { text: "Join in on the noise so you aren't the 'only one' left out of the fun.", type: "Unhealthy/Ineffective", points: 0, feedback: "Giving in to social pressure means you lose your work time AND risk getting in trouble alongside everyone else." },
      { text: "Practice Patience: Remind yourself that the period will be over in 20 minutes.", type: "Conflict-Resolution", points: 5, feedback: "Patience prevents overreaction, but it doesn't protect your focus. Combine patience with boundary-setting like earbuds or calmly asking neighbors to quiet down." },
      { text: "Take a deep breath and count to ten to manage your frustration.", type: "Emotion-Focused", points: 5, feedback: "Deep breathing will help you stay calm, but calming yourself is only the first step — you still have work to complete. Breathe first, then take action." }
    ],
    insight: { title: "Remaining Unbiased", content: "In a conflict, it's easy to pick sides. High-level leadership means looking at the facts and staying focused on the goal (like getting your work done), regardless of what others are doing.", icon: <ShieldAlert className="w-12 h-12 text-primary" /> }
  },
  {
    id: 7,
    title: "The Homework Mountain",
    description: "You have a test tomorrow, soccer practice tonight, and a messy room. You feel paralyzed by how much you have to do.",
    icon: <Zap className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Create a prioritized 'To-Do' list to break the mountain into small rocks.", type: "Problem-Focused", points: 10, feedback: "Excellent! To-do lists are essential for breaking down overwhelming tasks into manageable pieces. The key word is 'prioritized' — studying for the test should come before cleaning your room." },
      { text: "Tell your coach you need to leave practice 10 minutes early to study.", type: "Problem-Focused", points: 10, feedback: "Excellent! Setting a time boundary is a valid and mature problem-focused strategy. You're making a responsible choice to balance competing demands." },
      { text: "Lie on your bed staring at the ceiling thinking about everything you have to do.", type: "Unhealthy/Paralysis", points: 0, feedback: "This is the 'freeze' response — your brain shuts down from overwhelm. The longer you lie there, the less time you have AND the worse you feel." },
      { text: "Watch YouTube or play video games 'just for a few minutes' to decompress first.", type: "Unhealthy/Procrastination", points: 0, feedback: "The 'just a few minutes' trap: screens are designed to keep you engaged, so 5 minutes easily becomes 45 minutes." },
      { text: "Tell your parents you don't feel well so you can skip practice.", type: "Unhealthy/Deception", points: 0, feedback: "Faking sick is avoidance AND dishonesty, which creates new stress on top of existing stress. It also doesn't solve the problem." },
      { text: "Practice Proactive Coping: Set your clothes out for tomorrow now to save time.", type: "Problem-Focused", points: 5, feedback: "Proactive coping is good, but setting out clothes is low-priority when you have a test tomorrow. Create a prioritized to-do list first." },
      { text: "Spend 2 hours on 'Retail Therapy' browsing for things you want to buy.", type: "Unhealthy", points: 0, feedback: "Retail therapy adds more stress than it removes — you waste 2 hours you don't have, and the homework mountain is still there." }
    ],
    insight: { title: "Small Wins", content: "Hitting reasonable, attainable goals helps you realize you have the tools to make a change. Small things add up and make a big impact on your overall stress level.", icon: <CheckCircle2 className="w-12 h-12 text-primary" /> }
  },
  {
    id: 8,
    title: "The Sibling Argument",
    description: "You go to have cereal, but the milk is empty. Your sibling used the last of it and didn't tell anyone. You feel an explosion of anger.",
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Be Humble: Calmly tell them it frustrated you, but apologize if you started to yell.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Apologizing for your OWN reaction (even if they were wrong) de-escalates the conflict immediately and models mature communication." },
      { text: "Agree to Disagree: Suggest a new rule where the last person to use milk writes it on the list.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! This solves the FUTURE problem rather than relitigating the past. Creating a system removes the personal blame element." },
      { text: "Yell 'You ALWAYS do this!' and start listing every annoying thing they've ever done.", type: "Unhealthy/Escalation", points: 0, feedback: "Using words like 'always' and 'never' turns a small issue into a full-blown character attack. This guarantees escalation." },
      { text: "Go eat their snacks as revenge without telling them.", type: "Unhealthy/Retaliation", points: 0, feedback: "Revenge feels satisfying for about 5 seconds, then it creates a new cycle of conflict." },
      { text: "Slam your bedroom door to make sure they know you're mad.", type: "Unhealthy/Ineffective", points: 0, feedback: "Slamming a door communicates anger but not a solution — it doesn't fix the milk problem or prevent it from happening again." },
      { text: "Give them the silent treatment for the rest of the day.", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "The silent treatment punishes the other person without ever telling them what they did wrong or how to fix it. Unresolved conflict gets worse with silence." },
      { text: "Take a hot bath or shower to physically reset your mood before talking.", type: "Emotion-Focused", points: 5, feedback: "A physical reset prevents you from saying something you regret. However, it doesn't resolve the conflict — pair it with a calm conversation afterward." },
      { text: "Write your frustrations in a journal to 'get it out' safely.", type: "Emotion-Focused", points: 5, feedback: "Journaling is healthy but doesn't address the relationship. Journal first, then use that clarity to have a calm conversation with your sibling." }
    ],
    insight: { title: "Humility as a Tool", content: "If skills are not being used, it's usually because no one wants to be 'wrong.' Being humble enough to apologize for your part makes the other person feel heard and reduces the tension.", icon: <Activity className="w-12 h-12 text-primary" /> }
  }
];

export default function StressNavigator() {
  usePageTitle("Stress Navigator");
  const [step, setStep] = useState<"intro" | "scenario" | "feedback" | "insight" | "summary">("intro");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);

  const current = scenarios[scenarioIndex];

  const startAdventure = () => { setStep("scenario"); setScenarioIndex(0); setScore(0); };

  const handleChoice = (choice: Choice) => {
    setSelectedChoice(choice);
    setScore(prev => prev + choice.points);
    setStep("feedback");
  };

  const nextScenario = () => {
    if (scenarioIndex < scenarios.length - 1) {
      setScenarioIndex(prev => prev + 1);
      setSelectedChoice(null);
      setStep("scenario");
    } else {
      setStep("summary");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-background glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Breadcrumbs items={[{ label: "Activities", href: "/activities" }, { label: "Stress Navigator" }]} />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
          {/* Progress dots */}
          {["scenario", "feedback", "insight"].includes(step) && (
            <div className="w-full flex justify-center gap-2 pt-6">
              {scenarios.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i < scenarioIndex ? "w-4 bg-primary" :
                    i === scenarioIndex ? "w-10 bg-primary/60" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="p-8 md:p-12">
            {/* INTRO */}
            {step === "intro" && (
              <div className="text-center space-y-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-2xl mb-2">
                  <Brain className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">The Stress Navigator</h1>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Navigate 8 real-life challenges using the wisdom of <strong>Amy Morin</strong>, <strong>Dr. Goldman</strong>, and the <strong>Professional Leadership Institute</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <Zap className="w-5 h-5 mb-2 text-primary" />
                    <p className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">Problem</p>
                    <p className="text-xs text-foreground font-medium">Fix the cause.</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <Heart className="w-5 h-5 mb-2 text-primary" />
                    <p className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">Emotion</p>
                    <p className="text-xs text-foreground font-medium">Manage feelings.</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <Ear className="w-5 h-5 mb-2 text-primary" />
                    <p className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">Conflict</p>
                    <p className="text-xs text-foreground font-medium">Resolve disputes.</p>
                  </div>
                </div>
                <Button onClick={startAdventure} className="w-full py-6 text-lg gap-3 rounded-xl">
                  Start Training <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* SCENARIO */}
            {step === "scenario" && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-muted rounded-xl">{current.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Challenge {scenarioIndex + 1}</span>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">{current.title}</h2>
                  </div>
                </div>

                <div className="p-6 bg-foreground rounded-2xl text-background text-lg italic leading-relaxed relative">
                  <div className="absolute -top-3 -right-3 bg-primary p-2 rounded-full shadow-lg">
                    <MessageCircle size={20} className="text-primary-foreground" />
                  </div>
                  "{current.description}"
                </div>

                <div className="space-y-2">
                  {current.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChoice(choice)}
                      className="w-full p-4 text-left bg-card hover:bg-accent border-2 border-border hover:border-primary/30 rounded-xl transition-all group flex items-start gap-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/20 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:text-primary shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{choice.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FEEDBACK */}
            {step === "feedback" && selectedChoice && (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className={`inline-flex items-center justify-center p-5 rounded-full ${
                    selectedChoice.points === 10 ? "bg-green-100 text-green-600" :
                    selectedChoice.points === 5 ? "bg-blue-100 text-blue-600" :
                    "bg-amber-100 text-amber-600"
                  }`}>
                    {selectedChoice.points === 10 ? <CheckCircle2 className="w-14 h-14" /> :
                     selectedChoice.points === 5 ? <AlertCircle className="w-14 h-14" /> :
                     <Wind className="w-14 h-14" />}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {selectedChoice.points === 10 ? `Excellent! — ${selectedChoice.type}` :
                     selectedChoice.points === 5 ? `Partially Effective — ${selectedChoice.type}` :
                     "Ineffective Response"}
                  </h3>
                </div>

                <div className={`p-6 rounded-2xl leading-relaxed text-sm font-medium border-2 ${
                  selectedChoice.points === 10 ? "bg-green-50 border-green-200 text-green-900" :
                  selectedChoice.points === 5 ? "bg-blue-50 border-blue-200 text-blue-900" :
                  "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  {selectedChoice.feedback}
                </div>

                <Button onClick={() => setStep("insight")} className="w-full py-5 text-lg gap-2 rounded-xl">
                  Go to Lesson <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* INSIGHT */}
            {step === "insight" && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
                    {current.insight.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{current.insight.title}</h2>
                  <div className="bg-primary p-8 rounded-2xl text-primary-foreground text-base leading-relaxed text-left shadow-lg">
                    {current.insight.content}
                  </div>
                </div>

                <Button variant="outline" onClick={nextScenario} className="w-full py-5 text-lg gap-2 rounded-xl border-2">
                  Continue Training <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* SUMMARY */}
            {step === "summary" && (
              <div className="space-y-6 text-center">
                <h2 className="text-3xl font-bold text-foreground">Mission Accomplished!</h2>
                <div className="p-8 bg-primary rounded-2xl text-primary-foreground shadow-lg">
                  <p className="text-primary-foreground/60 font-bold uppercase tracking-[0.3em] text-xs mb-2">Training Complete</p>
                  <Brain className="w-16 h-16 mx-auto mb-4 text-primary-foreground/60" />
                  <p className="text-xl font-bold mb-2">Score: {score} / {scenarios.length * 10}</p>
                  <p className="text-primary-foreground/80 italic">
                    "You have completed all 8 challenges. Remember: healthy coping is a skill that gets stronger with practice!"
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200 text-left space-y-3">
                  <div className="flex items-center gap-3 text-green-800 font-bold text-lg">
                    <BookOpen className="text-green-500" /> Final Step: Reading Check
                  </div>
                  <p className="text-green-900 text-sm">
                    Excellent work practicing your skills! Now it's time to test what you've learned in the official assessment.
                  </p>
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLScljnOvIPOQvQzKxExkzGzM3kCqNLQc2Tpekx24NIz8vE0g6g/viewform?usp=header"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-center flex items-center justify-center gap-3 transition-all shadow-lg"
                  >
                    Start Reading Check <ExternalLink className="w-5 h-5" />
                  </a>
                </div>

                <Button variant="ghost" onClick={startAdventure} className="gap-2 text-muted-foreground">
                  <RotateCcw className="w-4 h-4" /> Restart Training
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
