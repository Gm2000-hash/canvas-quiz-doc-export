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
  Ear, Smile, Star, GraduationCap, Flame,
  HandHeart, Frown, Eye, Coffee,
  Palette, Theater, Bomb, Gauge
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
  // --- ORIGINAL 8 ---
  {
    id: 1,
    title: "The Unannounced Math Quiz",
    description: "You walk into 2nd period and see 'POP QUIZ' on the board. You haven't looked at your notes since Friday. Your heart starts racing.",
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Take 3 deep 'box breaths' to lower your heart rate and ground yourself.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Amy Morin identifies relaxation strategies like deep breathing as a top-tier healthy coping skill. In a pop quiz, the situation is outside your control — you can't un-schedule it. Box breathing directly lowers your heart rate and activates your parasympathetic nervous system, which is exactly the right move when you need to manage your emotional response to an uncontrollable stressor." },
      { text: "Quickly scan your notes for 2 minutes for key formulas before the quiz starts.", type: "Problem-Focused", points: 10, feedback: "Excellent! This is textbook problem-focused coping — you are working to 'rid yourself of the stressful situation' by taking direct action. Since there is still time before the quiz, scanning notes is a practical step that addresses the root cause of your anxiety (feeling unprepared). This shows strong problem-solving instincts." },
      { text: "Roll your eyes and say 'I don't even care' to play it cool.", type: "Unhealthy/Denial", points: 0, feedback: "This is a common reaction, but it's a form of emotional avoidance. Pretending you don't care doesn't make the stress disappear — it just buries it. Amy Morin warns that suppressing emotions prevents you from developing real coping skills." },
      { text: "Immediately text your parent to come pick you up so you can avoid the quiz.", type: "Unhealthy/Avoidant", points: 0, feedback: "Leaving to avoid a challenge feels like relief in the moment, but Amy Morin explains that avoidance creates a pattern where stress feels more and more unmanageable over time." },
      { text: "Put your head down on the desk and refuse to participate.", type: "Unhealthy/Shutdown", points: 0, feedback: "Shutting down is a stress response — your brain is going into 'freeze' mode because it feels overwhelmed. While this is understandable, it guarantees a zero and reinforces the belief that you can't handle hard things." },
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
      { text: "Use 'Effective Communication': Tell them, 'This project feels important to me, and I'd like to share an idea.'", type: "Conflict-Resolution", points: 5, feedback: "Using 'I' statements is a healthy communication tool. However, this alone may not work if the group dynamic is already combative. A stronger move: Listen to their ideas first, repeat them back, THEN share yours." },
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
      { text: "Keep refreshing their stories to see exactly what they are doing.", type: "Unhealthy/Avoidance", points: 0, feedback: "Digital 'doom-scrolling' actually increases your emotional distress — each refresh deepens the wound. You're feeding the pain rather than processing it." },
      { text: "Have Patience: Wait until tomorrow to decide if you want to text them about it.", type: "Conflict-Resolution", points: 5, feedback: "Patience is wise — reacting impulsively to social media often makes things worse. However, patience alone is passive. Combine it with an active coping strategy like going for a walk." },
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
      { text: "Listen to music that makes you feel empowered before the next practice.", type: "Emotion-Focused", points: 5, feedback: "Music can help manage your emotional state, but it's temporary — it doesn't improve your skills. Use it as a warm-up, then pair it with a concrete action plan." },
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
      { text: "Start crying and call your mom at work, panicking about how your day is ruined.", type: "Unhealthy/Catastrophizing", points: 0, feedback: "Missing a bus is a solvable problem, not a crisis. Catastrophic thinking amplifies stress far beyond the actual situation." },
      { text: "Use positive self-talk: 'One mistake doesn't define my whole day. I can figure this out.'", type: "Emotion-Focused", points: 5, feedback: "Self-talk can help stop an emotional spiral, but you need action more than affirmation. Combine it with immediate problem-solving." },
      { text: "Go back to sleep since you're already late; what's the point?", type: "Unhealthy/Avoidant", points: 0, feedback: "This creates much bigger problems — unexcused absences, missed work, and a pattern of giving up when things go wrong." },
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
      { text: "Join in on the noise so you aren't the 'only one' left out of the fun.", type: "Unhealthy/Ineffective", points: 0, feedback: "Giving in to social pressure means you lose your work time AND risk getting in trouble alongside everyone else." },
      { text: "Practice Patience: Remind yourself that the period will be over in 20 minutes.", type: "Conflict-Resolution", points: 5, feedback: "Patience prevents overreaction, but it doesn't protect your focus. Combine patience with boundary-setting like earbuds or calmly asking neighbors to quiet down." },
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
      { text: "Practice Proactive Coping: Set your clothes out for tomorrow now to save time.", type: "Problem-Focused", points: 5, feedback: "Proactive coping is good, but setting out clothes is low-priority when you have a test tomorrow. Create a prioritized to-do list first." },
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
      { text: "Write your frustrations in a journal to 'get it out' safely.", type: "Emotion-Focused", points: 5, feedback: "Journaling is healthy but doesn't address the relationship. Journal first, then use that clarity to have a calm conversation with your sibling." },
    ],
    insight: { title: "Humility as a Tool", content: "If skills are not being used, it's usually because no one wants to be 'wrong.' Being humble enough to apologize for your part makes the other person feel heard and reduces the tension.", icon: <Activity className="w-12 h-12 text-primary" /> }
  },
  // --- NEW 14 SCENARIOS ---
  {
    id: 9,
    title: "The Cafeteria Cold Shoulder",
    description: "You walk toward your usual lunch table and your friends go quiet. Someone whispers, and another glances at you then looks away. You feel invisible.",
    icon: <Frown className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Calmly sit down and say, 'Hey, is everything cool? It feels like something's off.'", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Addressing the tension directly but calmly takes courage. You're giving them a chance to be honest rather than letting assumptions build into resentment." },
      { text: "Go for a walk and call a trusted adult or friend to talk about how you feel.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Reaching out for social support is one of the healthiest coping strategies. Talking to someone you trust helps you process the rejection without spiraling." },
      { text: "Post a vague TikTok about 'fake friends' to send a message.", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "Vague posts create drama without solving anything. Your friends will either feel attacked or ignore it — neither outcome helps you." },
      { text: "Sit at a different table and pretend you don't care.", type: "Unhealthy/Avoidant", points: 0, feedback: "Pretending you don't care buries the hurt. The issue stays unresolved and the distance between you and your friends grows." },
      { text: "Write down how you feel in your phone notes before deciding what to do.", type: "Emotion-Focused", points: 5, feedback: "Writing is a solid first step to process emotions, but eventually you'll need to address the situation with your friends directly." },
    ],
    insight: { title: "Social Support", content: "Research shows that talking to a trusted person — a friend, parent, counselor — is one of the most effective ways to regulate stress. You don't have to navigate hard feelings alone.", icon: <HandHeart className="w-12 h-12 text-primary" /> }
  },
  {
    id: 10,
    title: "The Grade You Didn't Expect",
    description: "You studied all weekend for a History test and just got it back — you scored a 62%. Your stomach drops. You feel like all that effort was wasted.",
    icon: <GraduationCap className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Ask the teacher after class: 'Can we go over what I got wrong so I can improve?'", type: "Problem-Focused", points: 10, feedback: "Excellent! This is proactive problem-solving at its best. You're turning a setback into a learning opportunity and showing maturity that teachers respect." },
      { text: "Remind yourself: 'One test doesn't define me. I can learn from this and do better next time.'", type: "Emotion-Focused", points: 10, feedback: "Excellent! Reframing failure as a learning experience is a hallmark of a growth mindset. This self-talk prevents the grade from becoming your identity." },
      { text: "Crumple up the test and throw it away so no one sees it.", type: "Unhealthy/Avoidant", points: 0, feedback: "Hiding the evidence doesn't change the grade. You're also losing the chance to learn from your mistakes — the test is a study guide for what you need to review." },
      { text: "Compare your grade with classmates to see if anyone did worse.", type: "Unhealthy/Deflection", points: 0, feedback: "Comparing yourself to others is a trap. Even if someone scored lower, it doesn't improve YOUR understanding of the material." },
      { text: "Tell yourself you're just 'bad at History' and stop trying.", type: "Unhealthy/Helplessness", points: 0, feedback: "This is a fixed mindset trap. Labeling yourself as 'bad at' something gives you permission to quit. Skills improve with effort and strategy, not talent alone." },
    ],
    insight: { title: "Growth Mindset", content: "A growth mindset means believing that intelligence and abilities can be developed through effort, strategy, and feedback. One bad grade is data — not a verdict.", icon: <GraduationCap className="w-12 h-12 text-primary" /> }
  },
  {
    id: 11,
    title: "The Broken Promise",
    description: "Your best friend promised to go to the school dance with you but bailed at the last minute to go with someone else. You feel betrayed.",
    icon: <Heart className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Tell your friend: 'That really hurt me. I was counting on you and I need you to know how I feel.'", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Using 'I' statements to express hurt without attacking shows emotional maturity. You're being honest and giving the friendship a chance to repair." },
      { text: "Go to the dance anyway with other friends and focus on having a great time.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Choosing to still enjoy yourself is resilience in action. You're not letting one person's decision ruin your experience." },
      { text: "Send a long, angry text message calling them a terrible friend.", type: "Unhealthy/Escalation", points: 0, feedback: "Angry texts are almost always regretted. Words sent in anger can permanently damage trust and are impossible to unsend." },
      { text: "Stop talking to them completely and never bring it up.", type: "Unhealthy/Avoidant", points: 0, feedback: "The silent treatment punishes without communicating. Your friend may not even fully understand why you're upset, and the resentment festers." },
      { text: "Journal about what happened to sort through your feelings before responding.", type: "Emotion-Focused", points: 5, feedback: "Journaling creates clarity, but at some point you'll need to communicate your feelings to your friend. Use the journal as prep for that conversation." },
    ],
    insight: { title: "Assertive Communication", content: "Being assertive means expressing your feelings honestly and respectfully — without being passive (hiding your feelings) or aggressive (attacking the other person). It's the healthiest middle ground.", icon: <MessageCircle className="w-12 h-12 text-primary" /> }
  },
  {
    id: 12,
    title: "The Presentation Nightmare",
    description: "You have to give a 5-minute presentation in front of the class tomorrow. Your hands are already sweating just thinking about it.",
    icon: <Theater className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Practice your presentation out loud 3 times in front of a mirror or a family member.", type: "Problem-Focused", points: 10, feedback: "Excellent! Rehearsal is the #1 strategy for reducing presentation anxiety. The more familiar you are with your material, the less your brain perceives it as a threat." },
      { text: "Use visualization: Close your eyes and imagine yourself giving the presentation confidently.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Visualization is used by professional athletes, speakers, and performers. When your brain 'practices' success, it reduces the fear response during the actual event." },
      { text: "Decide to 'wing it' — overthinking just makes it worse.", type: "Unhealthy/Avoidant", points: 0, feedback: "Winging it feels like confidence, but it's actually avoidance disguised as bravery. Lack of preparation almost always increases anxiety during the actual presentation." },
      { text: "Ask the teacher if you can submit a written version instead of presenting.", type: "Unhealthy/Avoidant", points: 0, feedback: "While accommodations are valid in some cases, routinely avoiding public speaking prevents you from building a critical life skill." },
      { text: "Make note cards with key bullet points to use as a safety net during the presentation.", type: "Problem-Focused", points: 5, feedback: "Note cards are a solid tool, but they work best combined with actual rehearsal. Cards alone can become a crutch if you read directly from them." },
    ],
    insight: { title: "Exposure & Practice", content: "The more you expose yourself to something you fear (in manageable doses), the less scary it becomes. This is called 'graduated exposure' and it's how your brain learns that it CAN handle hard things.", icon: <Eye className="w-12 h-12 text-primary" /> }
  },
  {
    id: 13,
    title: "The Cyberbullying DM",
    description: "Someone created a group chat and is sending mean messages about you. A friend just screenshot them and sent them to you. Your face is burning.",
    icon: <Bomb className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Screenshot everything, then tell a trusted adult — parent, counselor, or teacher.", type: "Problem-Focused", points: 10, feedback: "Excellent! Documenting and reporting is the most effective action. Cyberbullying is serious, and adults have resources and authority to intervene that you don't." },
      { text: "Block the accounts involved and take a break from your phone for the night.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Blocking removes the immediate source of harm, and stepping away from your phone prevents the doom-scrolling cycle that amplifies distress." },
      { text: "Respond in the group chat to defend yourself and call them out.", type: "Unhealthy/Escalation", points: 0, feedback: "Engaging directly gives them what they want — a reaction. It also puts everything you say in writing, which can be taken out of context." },
      { text: "Create a counter group chat to say mean things about them.", type: "Unhealthy/Retaliation", points: 0, feedback: "Retaliation makes YOU a bully too. It escalates the situation and now there's evidence of you participating in the same behavior." },
      { text: "Delete the screenshots and try to forget about it.", type: "Unhealthy/Avoidant", points: 0, feedback: "Deleting evidence removes your ability to report the behavior later. Trying to forget serious bullying doesn't make it stop." },
    ],
    insight: { title: "Knowing When to Get Help", content: "Some situations are too big to handle alone — and that's okay. Cyberbullying, threats, and harassment are situations where getting an adult involved isn't 'snitching' — it's smart.", icon: <ShieldAlert className="w-12 h-12 text-primary" /> }
  },
  {
    id: 14,
    title: "The Family Fight",
    description: "Your parents are arguing loudly in the kitchen. You're in your room with your headphones on, but you can still hear them. Your chest feels tight.",
    icon: <Flame className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Put on music or a podcast and do something calming — draw, read, or stretch.", type: "Emotion-Focused", points: 10, feedback: "Excellent! You can't control your parents' argument, so focusing on regulating YOUR own emotions is exactly right. Creating a calming environment for yourself is healthy self-care." },
      { text: "Text or call a trusted friend or family member to talk about how you're feeling.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Reaching out for support when you're overwhelmed is a sign of strength. You don't have to sit alone with hard feelings." },
      { text: "Walk into the kitchen and start yelling at both of them to stop.", type: "Unhealthy/Escalation", points: 0, feedback: "Inserting yourself into an adult conflict escalates the situation and puts you at risk of becoming a target. Your parents' argument is not yours to fix." },
      { text: "Blame yourself and wonder if you caused the argument.", type: "Unhealthy/Self-Blame", points: 0, feedback: "Children are never responsible for their parents' arguments. Self-blame creates toxic shame that can lead to anxiety and depression." },
      { text: "Remind yourself: 'This is not about me. I can't fix this, but I can take care of myself right now.'", type: "Emotion-Focused", points: 5, feedback: "Great self-talk that sets healthy boundaries. Combine it with an active coping strategy like music, drawing, or reaching out to someone." },
    ],
    insight: { title: "What You Can vs. Can't Control", content: "One of the most powerful life skills is learning to separate what you CAN control (your actions, your words, your breathing) from what you CAN'T control (other people's behavior). Focus your energy on what you can change.", icon: <Gauge className="w-12 h-12 text-primary" /> }
  },
  {
    id: 15,
    title: "The Lunch Money Pressure",
    description: "An older student is pressuring you to give them your lunch money 'as a joke.' They're laughing, but it doesn't feel like a joke to you.",
    icon: <ShieldAlert className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Say 'No' firmly, walk away, and tell an adult immediately.", type: "Problem-Focused", points: 10, feedback: "Excellent! Setting a clear boundary and reporting it is the safest and most effective response. This isn't 'snitching' — it's protecting yourself." },
      { text: "Use the buddy system: Walk with friends to reduce the chance of being targeted.", type: "Problem-Focused", points: 10, feedback: "Excellent! Peer pressure and intimidation are harder to pull off when you have allies. This is a strategic, proactive coping skill." },
      { text: "Give them the money to avoid conflict and hope they leave you alone.", type: "Unhealthy/Submission", points: 0, feedback: "Giving in teaches them that the tactic works, making it MORE likely to happen again. You deserve to feel safe." },
      { text: "Try to fight them to show you're not afraid.", type: "Unhealthy/Escalation", points: 0, feedback: "Physical confrontation puts you at risk of injury and disciplinary action. There are far more effective ways to handle this." },
      { text: "Avoid the hallway where they hang out, even if it makes you late to class.", type: "Unhealthy/Avoidant", points: 0, feedback: "Changing your behavior to accommodate a bully gives them power over your daily life. Report the behavior instead." },
    ],
    insight: { title: "Setting Boundaries", content: "A boundary is a line you draw to protect your well-being. Saying 'No' clearly and walking away is not rude — it's a fundamental life skill. You have the right to feel safe.", icon: <ShieldAlert className="w-12 h-12 text-primary" /> }
  },
  {
    id: 16,
    title: "The Perfectionism Trap",
    description: "You've rewritten the first paragraph of your English essay four times. It's due in an hour and you haven't started the rest. Nothing feels 'good enough.'",
    icon: <Palette className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Move on to the next paragraph and come back to fix the first one later.", type: "Problem-Focused", points: 10, feedback: "Excellent! 'Progress over perfection' is a key strategy. Getting a complete draft done is more important than having one perfect paragraph and nothing else." },
      { text: "Set a 5-minute timer: When it goes off, move to the next section no matter what.", type: "Problem-Focused", points: 10, feedback: "Excellent! Time-boxing breaks the perfectionism cycle by giving you external permission to move on. It's a proven productivity technique." },
      { text: "Delete everything and start over — maybe a fresh start will feel better.", type: "Unhealthy/Perfectionism", points: 0, feedback: "Starting over wastes the work you've already done and restarts the perfectionism cycle. You'll likely get stuck on the first paragraph again." },
      { text: "Give up and turn in what you have, telling yourself it doesn't matter anyway.", type: "Unhealthy/Helplessness", points: 0, feedback: "Swinging from perfectionism to not caring is a common pattern, but both extremes hurt you. A complete 'good enough' essay scores better than one perfect paragraph." },
      { text: "Take a deep breath and remind yourself that 'done is better than perfect.'", type: "Emotion-Focused", points: 5, feedback: "Good self-talk, but you also need a concrete action plan. Combine this mindset shift with a time-boxing strategy to actually move forward." },
    ],
    insight: { title: "Progress Over Perfection", content: "Perfectionism disguises itself as high standards, but it's actually a form of fear — fear of not being good enough. The antidote is to aim for 'good enough' and improve from there.", icon: <Star className="w-12 h-12 text-primary" /> }
  },
  {
    id: 17,
    title: "The Locker Room Talk",
    description: "Some kids in the locker room are making fun of another student's appearance behind their back. They turn to you expecting you to join in.",
    icon: <Users className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Say, 'That's not cool' and walk away or change the subject.", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Standing up without escalating takes courage. Even a simple 'That's not cool' disrupts the group dynamic and signals that you don't endorse the behavior." },
      { text: "Don't laugh along — simply don't participate and walk away quietly.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Sometimes the most powerful thing you can do is not participate. Your silence sends a message, and leaving removes you from the situation." },
      { text: "Laugh along to fit in, even though it makes you uncomfortable.", type: "Unhealthy/Conformity", points: 0, feedback: "Laughing along makes you a participant in the bullying. It also erodes your own self-respect over time — you're acting against your values to fit in." },
      { text: "Add your own joke to one-up them and get more laughs.", type: "Unhealthy/Escalation", points: 0, feedback: "Escalating the mockery makes you the bully. If the target ever finds out (and they usually do), you've caused real harm." },
      { text: "Later, privately check in with the student who was being made fun of.", type: "Conflict-Resolution", points: 5, feedback: "Checking in shows empathy and kindness. But if possible, also address the behavior in the moment — bystander silence can feel like approval." },
    ],
    insight: { title: "Bystander to Upstander", content: "Most bullying stops within 10 seconds when a bystander speaks up. You don't have to give a speech — a simple 'That's not cool' or walking away can shift the entire dynamic.", icon: <HandHeart className="w-12 h-12 text-primary" /> }
  },
  {
    id: 18,
    title: "The Friendship Drift",
    description: "Your closest friend has been hanging out with a new group and barely talks to you anymore. You feel lonely and wonder if you did something wrong.",
    icon: <Heart className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Reach out honestly: 'Hey, I miss hanging out. Want to do something this weekend?'", type: "Conflict-Resolution", points: 10, feedback: "Excellent! Direct, honest communication is the healthiest way to address a drifting friendship. You're expressing your feelings without blame and offering a solution." },
      { text: "Explore new friendships and activities — join a club, team, or study group.", type: "Problem-Focused", points: 10, feedback: "Excellent! Expanding your social circle is proactive coping. It ensures your emotional well-being doesn't depend entirely on one person." },
      { text: "Send passive-aggressive texts like 'Must be nice to have new friends 🙄'", type: "Unhealthy/Passive-Aggressive", points: 0, feedback: "Passive-aggression pushes people further away. If your friend was considering reconnecting, this kind of message makes them less likely to." },
      { text: "Convince yourself you don't need friends and isolate yourself.", type: "Unhealthy/Avoidant", points: 0, feedback: "Self-isolation is a defense mechanism that feels protective but causes real harm. Humans are social creatures — we need connection." },
      { text: "Spend time on hobbies you enjoy to fill the gap while you figure things out.", type: "Emotion-Focused", points: 5, feedback: "Hobbies are great for processing feelings, but don't use them to avoid the conversation you need to have with your friend." },
    ],
    insight: { title: "Friendships Evolve", content: "Friendships naturally change as people grow. It doesn't always mean something is wrong. The healthiest response is to communicate openly AND be open to new connections.", icon: <Sparkles className="w-12 h-12 text-primary" /> }
  },
  {
    id: 19,
    title: "The Weekend Plans Pressure",
    description: "Your friends are planning to sneak out this weekend to go to a party. They're pressuring you to come and calling you 'boring' for hesitating.",
    icon: <Flame className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Say 'I'm good — that's not my thing' and suggest an alternative hangout.", type: "Problem-Focused", points: 10, feedback: "Excellent! Declining firmly while offering an alternative shows you value the friendship without compromising your boundaries. True friends will respect your decision." },
      { text: "Ask yourself: 'Will this matter in a year?' and make your decision based on your values.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Values-based decision making is a high-level coping skill. When you anchor choices to your values rather than peer pressure, you build long-term self-respect." },
      { text: "Go along with it because you don't want to be the outcast.", type: "Unhealthy/Conformity", points: 0, feedback: "Going against your gut to fit in creates anxiety, guilt, and potential consequences. The 'boring' label is temporary — the consequences might not be." },
      { text: "Lie and say your parents won't let you, to avoid having to explain your real feelings.", type: "Unhealthy/Avoidant", points: 0, feedback: "Blaming your parents avoids the real issue — you don't want to go. Using your parents as a shield prevents you from practicing assertive communication." },
      { text: "Tell a parent or trusted adult about the situation to get their perspective.", type: "Problem-Focused", points: 5, feedback: "Getting advice is wise, but you'll still need to communicate your decision to your friends yourself. Use the adult's perspective to build your confidence." },
    ],
    insight: { title: "Peer Pressure & Values", content: "Real friends don't pressure you into things that make you uncomfortable. If someone calls you 'boring' for having boundaries, that tells you more about them than about you.", icon: <ShieldAlert className="w-12 h-12 text-primary" /> }
  },
  {
    id: 20,
    title: "The Test Anxiety Spiral",
    description: "You're sitting in a big exam and your mind goes completely blank. You can't remember anything you studied. Panic is rising in your chest.",
    icon: <Brain className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Close your eyes, take 4 slow breaths, then start with the easiest question you can find.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Breathing resets your nervous system, and starting with an easy question builds momentum. Once you answer one, your brain starts unlocking stored information." },
      { text: "Skip the hard questions and come back to them — answer what you know first.", type: "Problem-Focused", points: 10, feedback: "Excellent! This is a proven test-taking strategy. Answering easier questions first builds confidence and often triggers recall for harder ones." },
      { text: "Stare at the first question getting more and more panicked.", type: "Unhealthy/Freeze", points: 0, feedback: "Staring at a blank page amplifies the freeze response. Your brain needs a reset — move to something easier to break the cycle." },
      { text: "Give up and turn in a blank test, telling yourself you'll 'do better next time.'", type: "Unhealthy/Avoidant", points: 0, feedback: "A blank test is a guaranteed zero. Even partial answers often earn partial credit. Something is always better than nothing." },
      { text: "Write down everything you can remember about the topic in the margins before answering.", type: "Problem-Focused", points: 5, feedback: "A 'brain dump' in the margins can help unlock memory. It's a decent strategy, but combine it with breathing first to calm the panic." },
    ],
    insight: { title: "Managing Anxiety in the Moment", content: "Test anxiety is your brain's threat response misfiring. The information IS in there — your stress just blocked access. Breathing and starting small opens the door back up.", icon: <Brain className="w-12 h-12 text-primary" /> }
  },
  {
    id: 21,
    title: "The Coach's Criticism",
    description: "Your coach called you out in front of the whole team for a mistake during practice. Your face is red and your teammates are staring.",
    icon: <Trophy className="w-8 h-8 text-primary" />,
    choices: [
      { text: "After practice, ask the coach privately: 'Can you show me what I should do differently?'", type: "Problem-Focused", points: 10, feedback: "Excellent! Seeking feedback privately turns embarrassment into a growth opportunity. It shows maturity and earns the coach's respect." },
      { text: "Take a deep breath, nod, and channel the frustration into giving extra effort for the rest of practice.", type: "Emotion-Focused", points: 10, feedback: "Excellent! Using frustration as fuel is emotional regulation at a high level. You're not suppressing the feeling — you're redirecting it productively." },
      { text: "Talk back to the coach to defend yourself in front of everyone.", type: "Unhealthy/Escalation", points: 0, feedback: "Talking back publicly escalates the conflict and often leads to consequences like benching or suspension. Save the conversation for a private moment." },
      { text: "Quit the team because you're humiliated.", type: "Unhealthy/Avoidant", points: 0, feedback: "Quitting over one bad moment means you never develop resilience. Every great athlete has been criticized — what separates them is how they respond." },
      { text: "Remind yourself that the coach is trying to make you better, even if the delivery was harsh.", type: "Emotion-Focused", points: 5, feedback: "Reframing is helpful, but you should also address it. After practice, ask the coach to give feedback privately in the future. You can advocate for yourself respectfully." },
    ],
    insight: { title: "Feedback vs. Criticism", content: "Feedback helps you grow. Criticism tears you down. Learning to extract the useful lesson from even harsh feedback — while advocating for respectful delivery — is an advanced life skill.", icon: <Star className="w-12 h-12 text-primary" /> }
  },
  {
    id: 22,
    title: "The End-of-Year Burnout",
    description: "It's the last month of school. You have finals, projects, and activities all piling up. You feel exhausted, unmotivated, and like you're running on empty.",
    icon: <Coffee className="w-8 h-8 text-primary" />,
    choices: [
      { text: "Create a countdown calendar and schedule study blocks with built-in breaks.", type: "Problem-Focused", points: 10, feedback: "Excellent! Breaking an overwhelming stretch into visible, manageable chunks makes the finish line feel reachable. Built-in breaks prevent burnout from getting worse." },
      { text: "Talk to a teacher or counselor about what you're feeling — they may be able to help you prioritize.", type: "Problem-Focused", points: 10, feedback: "Excellent! Adults can help you triage what's most important. Sometimes just hearing 'you're doing enough' from a trusted person can lift a huge weight." },
      { text: "Stay up until 2 AM every night trying to get everything done.", type: "Unhealthy/Burnout", points: 0, feedback: "Sleep deprivation makes everything worse — your memory, mood, and performance all suffer. You're trading short-term progress for long-term collapse." },
      { text: "Stop caring about your grades since the year is almost over anyway.", type: "Unhealthy/Apathy", points: 0, feedback: "Checking out at the end erases months of hard work. Finals and projects carry significant weight — a strong finish matters." },
      { text: "Reward yourself with something small after each completed task — a snack, a song, a 10-minute break.", type: "Emotion-Focused", points: 5, feedback: "Small rewards build motivation, but they work best as part of a structured plan. Without a schedule, rewards can turn into procrastination." },
    ],
    insight: { title: "Sustainable Effort", content: "Burnout happens when the demands on you exceed your resources. The fix isn't to 'try harder' — it's to work smarter: prioritize, take breaks, ask for help, and protect your sleep.", icon: <Coffee className="w-12 h-12 text-primary" /> }
  },
];

interface ResponseRecord {
  scenarioTitle: string;
  choiceText: string;
  choiceType: string;
  points: number;
}

export default function StressNavigator() {
  usePageTitle("Stress Navigator");
  const [step, setStep] = useState<"intro" | "scenario" | "feedback" | "insight" | "summary">("intro");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);

  const current = scenarios[scenarioIndex];
  const maxScore = scenarios.length * 10;

  const startAdventure = () => {
    setStep("scenario");
    setScenarioIndex(0);
    setScore(0);
    setSelectedChoice(null);
    setResponses([]);
  };

  const handleChoice = (choice: Choice) => {
    setSelectedChoice(choice);
    setScore(prev => prev + choice.points);
    setResponses(prev => [...prev, {
      scenarioTitle: current.title,
      choiceText: choice.text,
      choiceType: choice.type,
      points: choice.points,
    }]);
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

  const scorePercent = Math.round((score / maxScore) * 100);
  const perfectCount = responses.filter(r => r.points === 10).length;
  const partialCount = responses.filter(r => r.points === 5).length;
  const missedCount = responses.filter(r => r.points === 0).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-background glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <Breadcrumbs items={[{ label: "Activities", path: "/activities" }, { label: "Stress Navigator" }]} />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
          {/* Progress dots */}
          {["scenario", "feedback", "insight"].includes(step) && (
            <div className="w-full flex justify-center gap-1.5 pt-6 px-4 flex-wrap">
              {scenarios.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i < scenarioIndex ? "w-3 bg-primary" :
                    i === scenarioIndex ? "w-6 bg-primary/60" : "w-2 bg-muted"
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
                    Navigate {scenarios.length} real-life challenges using the wisdom of <strong>Amy Morin</strong>, <strong>Dr. Goldman</strong>, and the <strong>Professional Leadership Institute</strong>.
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
                  {scenarioIndex < scenarios.length - 1 ? "Continue Training" : "See My Results"} <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* SUMMARY */}
            {step === "summary" && (
              <div className="space-y-6">
                {/* Celebration header */}
                <div className="text-center space-y-4">
                  <div className="text-5xl animate-bounce">🎉</div>
                  <h2 className="text-3xl font-bold text-foreground">Training Complete!</h2>
                  <p className="text-muted-foreground">You navigated all {scenarios.length} challenges. Here's how you did:</p>
                </div>

                {/* Score card */}
                <div className="p-6 bg-primary rounded-2xl text-primary-foreground shadow-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-6 h-6 ${i < Math.ceil(scorePercent / 20) ? "fill-current" : "opacity-30"}`} />
                    ))}
                  </div>
                  <p className="text-3xl font-bold">{score} / {maxScore}</p>
                  <p className="text-primary-foreground/70 text-sm mt-1">{scorePercent}% — {
                    scorePercent >= 90 ? "Outstanding! You're a coping expert!" :
                    scorePercent >= 70 ? "Great job! You have strong coping instincts!" :
                    scorePercent >= 50 ? "Good effort! Keep practicing these skills!" :
                    "Nice try! Review the lessons and try again!"
                  }</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-700">{perfectCount}</p>
                    <p className="text-xs text-green-600 font-medium">Excellent</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <p className="text-2xl font-bold text-blue-700">{partialCount}</p>
                    <p className="text-xs text-blue-600 font-medium">Partial</p>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-700">{missedCount}</p>
                    <p className="text-xs text-amber-600 font-medium">Missed</p>
                  </div>
                </div>

                {/* Response breakdown */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Your Responses</h3>
                  <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                    {responses.map((r, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                        r.points === 10 ? "bg-green-50/50 border-green-200" :
                        r.points === 5 ? "bg-blue-50/50 border-blue-200" :
                        "bg-amber-50/50 border-amber-200"
                      }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          r.points === 10 ? "bg-green-200 text-green-700" :
                          r.points === 5 ? "bg-blue-200 text-blue-700" :
                          "bg-amber-200 text-amber-700"
                        }`}>
                          {r.points === 10 ? "✓" : r.points === 5 ? "~" : "✗"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{i + 1}. {r.scenarioTitle}</p>
                          <p className="text-muted-foreground truncate">{r.choiceText}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          r.points === 10 ? "bg-green-200 text-green-800" :
                          r.points === 5 ? "bg-blue-200 text-blue-800" :
                          "bg-amber-200 text-amber-800"
                        }`}>{r.points}pt</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Celebration message */}
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl text-center">
                  <p className="text-lg font-bold text-foreground mb-1">🌟 You did it!</p>
                  <p className="text-sm text-muted-foreground">
                    Remember: healthy coping is a skill that gets stronger with practice. Every time you choose a healthy response, you're rewiring your brain for resilience!
                  </p>
                </div>

                {/* Retake button */}
                <Button onClick={startAdventure} className="w-full py-5 text-lg gap-2 rounded-xl">
                  <RotateCcw className="w-5 h-5" /> Retake the Training
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
