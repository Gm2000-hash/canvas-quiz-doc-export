/**
 * Shared NGSS data constants extracted for reuse across components.
 */

export const DOK_LEVELS = [
  { value: 1, label: "1 – Recall & Reproduction" },
  { value: 2, label: "2 – Skills & Concepts" },
  { value: 3, label: "3 – Strategic Thinking" },
  { value: 4, label: "4 – Extended Thinking" },
];

export const BLOOMS_LEVELS = [
  { value: "Remember", label: "Remember" },
  { value: "Understand", label: "Understand" },
  { value: "Apply", label: "Apply" },
  { value: "Analyze", label: "Analyze" },
  { value: "Evaluate", label: "Evaluate" },
  { value: "Create", label: "Create" },
];

// Complete list of all MS NGSS performance expectations
export const ALL_SUBSTANDARDS: Record<string, { code: string; description: string }[]> = {
  "MS-LS1": [
    { code: "MS-LS1-1", description: "Conduct an investigation to provide evidence that living things are made of cells" },
    { code: "MS-LS1-2", description: "Develop and use a model to describe the function of a cell as a whole and ways the parts of cells contribute to the function" },
    { code: "MS-LS1-3", description: "Use argument supported by evidence for how the body is a system of interacting subsystems" },
    { code: "MS-LS1-4", description: "Use argument based on empirical evidence and scientific reasoning to support an explanation for how characteristic animal behaviors and specialized plant structures affect the probability of successful reproduction" },
    { code: "MS-LS1-5", description: "Construct a scientific explanation based on evidence for how environmental and genetic factors influence the growth of organisms" },
    { code: "MS-LS1-6", description: "Construct a scientific explanation based on evidence for the role of photosynthesis in the cycling of matter and flow of energy into and out of organisms" },
    { code: "MS-LS1-7", description: "Develop a model to describe how food is rearranged through chemical reactions forming new molecules that support growth and/or release energy" },
    { code: "MS-LS1-8", description: "Gather and synthesize information that sensory receptors respond to stimuli by sending messages to the brain for immediate behavior or storage as memories" },
  ],
  "MS-LS2": [
    { code: "MS-LS2-1", description: "Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations" },
    { code: "MS-LS2-2", description: "Construct an explanation that predicts patterns of interactions among organisms across multiple ecosystems" },
    { code: "MS-LS2-3", description: "Develop a model to describe the cycling of matter and flow of energy among living and nonliving parts of an ecosystem" },
    { code: "MS-LS2-4", description: "Construct an argument supported by empirical evidence that changes to physical or biological components of an ecosystem affect populations" },
    { code: "MS-LS2-5", description: "Evaluate competing design solutions for maintaining biodiversity and ecosystem services" },
  ],
  "MS-LS3": [
    { code: "MS-LS3-1", description: "Develop and use a model to describe why structural changes to genes (mutations) located on chromosomes may affect proteins and may result in harmful, beneficial, or neutral effects" },
    { code: "MS-LS3-2", description: "Develop and use a model to describe why asexual reproduction results in offspring with identical genetic information and sexual reproduction results in offspring with genetic variation" },
  ],
  "MS-LS4": [
    { code: "MS-LS4-1", description: "Analyze and interpret data for patterns in the fossil record that document the existence, diversity, extinction, and change of life forms" },
    { code: "MS-LS4-2", description: "Apply scientific ideas to construct an explanation for the anatomical similarities and differences among modern organisms and between modern and fossil organisms" },
    { code: "MS-LS4-3", description: "Analyze displays of pictorial data to compare patterns of similarities in the embryological development across multiple species" },
    { code: "MS-LS4-4", description: "Construct an explanation based on evidence that describes how genetic variations of traits in a population increase some individuals' probability of surviving and reproducing" },
    { code: "MS-LS4-5", description: "Gather and synthesize information about technologies that have changed the way humans influence the inheritance of desired traits in organisms" },
    { code: "MS-LS4-6", description: "Use mathematical representations to support explanations of how natural selection may lead to increases and decreases of specific traits in populations over time" },
  ],
  "MS-ESS1": [
    { code: "MS-ESS1-1", description: "Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons" },
    { code: "MS-ESS1-2", description: "Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system" },
    { code: "MS-ESS1-3", description: "Analyze and interpret data to determine scale properties of objects in the solar system" },
    { code: "MS-ESS1-4", description: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history" },
  ],
  "MS-ESS2": [
    { code: "MS-ESS2-1", description: "Develop a model to describe the cycling of Earth's materials and the flow of energy that drives this process" },
    { code: "MS-ESS2-2", description: "Construct an explanation based on evidence for how geoscience processes have changed Earth's surface at varying time and spatial scales" },
    { code: "MS-ESS2-3", description: "Analyze and interpret data on the distribution of fossils and rocks, continental shapes, and seafloor structures to provide evidence of the past plate motions" },
    { code: "MS-ESS2-4", description: "Develop a model to describe the cycling of water through Earth's systems driven by energy from the sun and the force of gravity" },
    { code: "MS-ESS2-5", description: "Collect data to provide evidence for how the motions and complex interactions of air masses result in changes in weather conditions" },
    { code: "MS-ESS2-6", description: "Develop and use a model to describe how unequal heating and rotation of the Earth cause patterns of atmospheric and oceanic circulation" },
  ],
  "MS-ESS3": [
    { code: "MS-ESS3-1", description: "Construct a scientific explanation based on evidence for how the uneven distributions of Earth's mineral, energy, and groundwater resources are the result of past and current geoscience processes" },
    { code: "MS-ESS3-2", description: "Analyze and interpret data on natural hazards to forecast future catastrophic events and inform the development of technologies to mitigate their effects" },
    { code: "MS-ESS3-3", description: "Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment" },
  ],
  "MS-PS1": [
    { code: "MS-PS1-1", description: "Develop models to describe the atomic composition of simple molecules and extended structures" },
    { code: "MS-PS1-2", description: "Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred" },
    { code: "MS-PS1-3", description: "Gather and make sense of information to describe that synthetic materials come from natural resources and impact society" },
    { code: "MS-PS1-4", description: "Develop a model that predicts and describes changes in particle motion, temperature, and state of a pure substance when thermal energy is added or removed" },
    { code: "MS-PS1-5", description: "Develop and use a model to describe how the total number of atoms does not change in a chemical reaction and thus mass is conserved" },
    { code: "MS-PS1-6", description: "Undertake a design project to construct, test, and modify a device that either releases or absorbs thermal energy by chemical processes" },
  ],
  "MS-PS2": [
    { code: "MS-PS2-1", description: "Apply Newton's Third Law to design a solution to a problem involving the motion of two colliding objects" },
    { code: "MS-PS2-2", description: "Plan an investigation to provide evidence that the change in an object's motion depends on the sum of the forces acting on the object and the mass of the object" },
    { code: "MS-PS2-3", description: "Ask questions about data to determine the factors that affect the strength of electric and magnetic forces" },
    { code: "MS-PS2-4", description: "Construct and present arguments using evidence to support the claim that gravitational interactions are attractive and depend on the masses of interacting objects" },
    { code: "MS-PS2-5", description: "Conduct an investigation and evaluate the experimental design to provide evidence that fields exist between objects exerting forces on each other even though the objects are not in contact" },
  ],
  "MS-PS3": [
    { code: "MS-PS3-1", description: "Construct and interpret graphical displays of data to describe the relationships of kinetic energy to the mass of an object and to the speed of an object" },
    { code: "MS-PS3-2", description: "Develop a model to describe that when the arrangement of objects interacting at a distance changes, different amounts of potential energy are stored in the system" },
    { code: "MS-PS3-3", description: "Apply scientific principles to design, construct, and test a device that either minimizes or maximizes thermal energy transfer" },
    { code: "MS-PS3-4", description: "Plan an investigation to determine the relationships among the energy transferred, the type of matter, the mass, and the change in the average kinetic energy of the particles as measured by the temperature of the sample" },
    { code: "MS-PS3-5", description: "Construct, use, and present arguments to support the claim that when the kinetic energy of an object changes, energy is transferred to or from the object" },
  ],
  "MS-PS4": [
    { code: "MS-PS4-1", description: "Use mathematical representations to describe a simple model for waves that includes how the amplitude of a wave is related to the energy in a wave" },
    { code: "MS-PS4-2", description: "Develop and use a model to describe that waves are reflected, absorbed, or transmitted through various materials" },
    { code: "MS-PS4-3", description: "Integrate qualitative scientific and technical information to support the claim that digitized signals are a more reliable way to encode and transmit information than analog signals" },
  ],
};
