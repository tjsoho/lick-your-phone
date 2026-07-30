import { BasePage } from "./types";

export type AdditionalTile = {
    id: string;
    title: string;
    titleBold: boolean;
    description: string;
    descriptionBold: boolean;
    backgroundColor: string;
};

export type AdditionalFAQ = {
    id: string;
    question: string;
    questionBold: boolean;
    answer: string;
    answerBold: boolean;
};

export type CarouselItem = {
    id: number;
    image: string;
    title: string;
    icon?: string;
    showIcon?: boolean;
    /**
     * Optional internal link target. Empty string means "no link — just an
     * image." When non-empty, the public Hero wraps the slide in a
     * Next.js <Link href={pageSlug}>.
     */
    pageSlug: string;
};

export type Section2JourneyCard = {
    id: number;
    image: string;
    title: string;
    titleBold: boolean;
    description: string;
    descriptionBold: boolean;
    icon?: string;
    showIcon?: boolean;
};

export type Section3Card = {
    id: number;
    title: string;
    titleBold: boolean;
    description: string;
    descriptionBold: boolean;
    buttonText: string;
    buttonLink?: string;
};

export type Section4Service = {
    id: number;
    name: string;
    nameBold: boolean;
    icon?: string;
    showIcon?: boolean;
};

export type Section5ApproachCard = {
    id: number;
    title: string;
    titleBold: boolean;
    description: string;
    descriptionBold: boolean;
    icon?: string;
    showIcon?: boolean;
};

/** A single stat tile on Section 8 — big number/headline + small description. */
export type Section8Stat = {
    id: number;
    number: string;
    unit?: string;
    description: string;
};

/** A single client logo on Section 8 (admin uploads the image + alt text). */
export type Section8ClientLogo = {
    id: number;
    image: string;
    alt: string;
};

/** A single testimonial card on Section 8. */
export type Section8Testimonial = {
    id: number;
    quote: string;
    author: string;
    role: string;
    company: string;
};

export type HomePageContent = {
    /**
     * Drag-and-drop order for the home sections (Section2–Section7).
     * Hero is fixed first and not represented here. Persisted on the page
     * row so admins can reorder the sidebar and the public render follows.
     */
    sectionsOrder: (
        | "section2"
        | "section3"
        | "section4"
        | "section5"
        | "section6"
        | "section7"
        | "section8"
    )[];
    /**
     * Per-section visibility eye-toggles. Undefined defaults to visible,
     * so legacy DB rows keep rendering everything until they're re-saved.
     */
    section2Visible: boolean;
    section3Visible: boolean;
    section4Visible: boolean;
    section5Visible: boolean;
    section6Visible: boolean;
    section7Visible: boolean;
    section8Visible: boolean;
    heroImage: string;
    heroTitle: string;
    heroTitleBold: boolean;
    heroParagraph: string;
    heroParagraphBold: boolean;
    heroButton1Text: string;
    heroButton2Text: string;
    heroCarousel: CarouselItem[];
    section2title: string;
    section2titleBold: boolean;
    section2paragraph: string;
    section2paragraphBold: boolean;
    section2subtitle: string;
    section2buttonText: string;
    section2JourneyCards: Section2JourneyCard[];
    section3subtitle: string;
    section3title: string;
    section3titleBold: boolean;
    section3description: string;
    section3descriptionBold: boolean;
    section3backgroundImage: string;
    section3cards: Section3Card[];
    section4subtitle: string;
    section4title: string;
    section4titleBold: boolean;
    section4description: string;
    section4descriptionBold: boolean;
    section4services: Section4Service[];
    section5subtitle: string;
    section5title: string;
    section5titleBold: boolean;
    section5description: string;
    section5descriptionBold: boolean;
    section5backgroundImage: string;
    section5approachCards: Section5ApproachCard[];
    section6title: string;
    section6titleBold: boolean;
    section6faq1question: string;
    section6faq1questionBold: boolean;
    section6faq1answer: string;
    section6faq1answerBold: boolean;
    section6faq2question: string;
    section6faq2questionBold: boolean;
    section6faq2answer: string;
    section6faq2answerBold: boolean;
    section6faq3question: string;
    section6faq3questionBold: boolean;
    section6faq3answer: string;
    section6faq3answerBold: boolean;
    section6faq4question: string;
    section6faq4questionBold: boolean;
    section6faq4answer: string;
    section6faq4answerBold: boolean;
    additionalSection6Faqs: AdditionalFAQ[];
    section7subtitle: string;
    section7title: string;
    section7titleBold: boolean;
    section7description: string;
    section7descriptionBold: boolean;
    section7backgroundImage: string;
    section7button1Text: string;
    section7button2Text: string;

    /* ─── Section 8 — Trusted Nationwide (stats + logos + testimonials) ─── */
    section8subtitle: string;
    section8title: string;
    section8titleBold: boolean;
    section8paragraph: string;
    section8paragraphBold: boolean;
    section8stats: Section8Stat[];
    section8clientLogos: Section8ClientLogo[];
    section8testimonials: Section8Testimonial[];
};

export type HomePageProps = BasePage<HomePageContent>;

export const homePageFallbackData: HomePageProps = {
    title: "Home",
    description: "A starter website template.",
    slug: "home",
    content: {
        sectionsOrder: [
            "section2",
            "section3",
            "section4",
            "section5",
            "section8",
            "section6",
            "section7",
        ],
        section2Visible: true,
        section3Visible: true,
        section4Visible: true,
        section5Visible: true,
        section6Visible: true,
        section7Visible: true,
        section8Visible: true,
        heroImage: "/images/placeholder.svg",
        heroTitle: "Your headline goes here",
        heroTitleBold: false,
        heroParagraph:
            "A short supporting sentence that explains what you do and why it matters.\nThis is placeholder copy — edit it in the admin panel.",
        heroParagraphBold: false,
        heroButton1Text: "Get Started",
        heroButton2Text: "Learn More",
        heroCarousel: [
            {
                id: 1,
                image: "/images/placeholder.svg",
                title: "Feature one",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 2,
                image: "/images/placeholder.svg",
                title: "Feature two",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 3,
                image: "/images/placeholder.svg",
                title: "Feature three",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 4,
                image: "/images/placeholder.svg",
                title: "Feature four",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 5,
                image: "/images/placeholder.svg",
                title: "Feature five",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 6,
                image: "/images/placeholder.svg",
                title: "Feature six",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 7,
                image: "/images/placeholder.svg",
                title: "Feature seven",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 8,
                image: "/images/placeholder.svg",
                title: "Feature eight",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
            {
                id: 9,
                image: "/images/placeholder.svg",
                title: "Feature nine",
                icon: "/images/placeholder.svg",
                pageSlug: "",
            },
        ],
        section2title: "A clear section heading",
        section2titleBold: false,
        section2paragraph:
            "Use this paragraph to describe a key part of your offer. Keep it to two or three sentences of plain, benefit-led copy.",
        section2paragraphBold: false,
        section2subtitle: "- HOW IT WORKS -",
        section2buttonText: "Learn more →",
        section2JourneyCards: [
            {
                id: 1,
                image: "/images/placeholder.svg",
                title: "Understand",
                titleBold: false,
                description: "A short description of step one.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 2,
                image: "/images/placeholder.svg",
                title: "Design",
                titleBold: false,
                description:
                    "A short description of step two.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 3,
                image: "/images/placeholder.svg",
                title: "Deliver",
                titleBold: false,
                description: "A short description of step three.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 4,
                image: "/images/placeholder.svg",
                title: "Evolve",
                titleBold: false,
                description:
                    "A short description of step four.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
        ],
        section3subtitle: "- AUDIENCES -",
        section3title: "Built for every kind of team",
        section3titleBold: false,
        section3description:
            "Introduce the groups you serve with a sentence of supporting copy. Replace this placeholder text in the admin panel.",
        section3descriptionBold: false,
        section3backgroundImage: "/images/placeholder.svg",
        section3cards: [
            {
                id: 1,
                title: "Audience One",
                titleBold: false,
                description:
                    "Describe this audience and what you offer them in one or two sentences.",
                descriptionBold: false,
                buttonText: "Discover",
            },
            {
                id: 2,
                title: "Audience Two",
                titleBold: false,
                description:
                    "Describe this audience and what you offer them in one or two sentences.",
                descriptionBold: false,
                buttonText: "Discover",
            },
        ],
        section4subtitle: "- SERVICES -",
        section4title: "What we offer",
        section4titleBold: false,
        section4description:
            "Use this paragraph to describe a key part of your offer. Keep it to two or three sentences of plain, benefit-led copy.",
        section4descriptionBold: false,
        section4services: [
            {
                id: 1,
                name: "Service One",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 2,
                name: "Service Two",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 3,
                name: "Service Three",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 4,
                name: "Service Four",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 5,
                name: "Service Five",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 6,
                name: "Service Six",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 7,
                name: "Service Seven",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 8,
                name: "Service Eight",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 9,
                name: "Service Nine",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 10,
                name: "Service Ten",
                nameBold: false,
                icon: "/images/placeholder.svg",
            },
        ],
        section5subtitle: "- AUDIENCES -",
        section5title: "Built for every kind of team",
        section5titleBold: false,
        section5description:
            "Introduce the groups you serve with a sentence of supporting copy. Replace this placeholder text in the admin panel.",
        section5descriptionBold: false,
        section5backgroundImage: "/images/placeholder.svg",
        section5approachCards: [
            {
                id: 1,
                title: "Strategically aligned",
                titleBold: false,
                description:
                    "A short description of this benefit.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 2,
                title: "Expert instructors",
                titleBold: false,
                description:
                    "A short description of this benefit.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 3,
                title: "Hassle-free delivery",
                titleBold: false,
                description:
                    "A short description of this benefit.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 4,
                title: "Flexible scheduling",
                titleBold: false,
                description:
                    "A short description of this benefit.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
            {
                id: 5,
                title: "Measurable impact",
                titleBold: false,
                description:
                    "A short description of this benefit.",
                descriptionBold: false,
                icon: "/images/placeholder.svg",
            },
        ],
        section6title: "Frequently Asked Questions",
        section6titleBold: false,
        section6faq1question: "What is your first frequently asked question?",
        section6faq1questionBold: false,
        section6faq1answer:
            "Answer the question here. This is placeholder copy you can edit in the admin panel.",
        section6faq1answerBold: false,
        section6faq2question: "What is your second frequently asked question?",
        section6faq2questionBold: false,
        section6faq2answer:
            "Answer the question here. This is placeholder copy you can edit in the admin panel.",
        section6faq2answerBold: false,
        section6faq3question: "What is your third frequently asked question?",
        section6faq3questionBold: false,
        section6faq3answer:
            "Answer the question here. This is placeholder copy you can edit in the admin panel.",
        section6faq3answerBold: false,
        section6faq4question: "What is your fourth frequently asked question?",
        section6faq4questionBold: false,
        section6faq4answer:
            "Answer the question here. This is placeholder copy you can edit in the admin panel.",
        section6faq4answerBold: false,
        additionalSection6Faqs: [],
        section7subtitle: "- AUDIENCES -",
        section7title: "Built for every kind of team",
        section7titleBold: false,
        section7description:
            "Introduce the groups you serve with a sentence of supporting copy. Replace this placeholder text in the admin panel.",
        section7descriptionBold: false,
        section7backgroundImage: "/images/placeholder.svg",
        section7button1Text: "Get Started",
        section7button2Text: "Learn More",

        section8subtitle: "- TRUSTED BY TEAMS -",
        section8title: "Trusted by teams everywhere",
        section8titleBold: false,
        section8paragraph:
            "Use this space to build trust — a sentence or two about your track record. This is placeholder copy you can edit in the admin panel.",
        section8paragraphBold: false,
        section8stats: [
            {
                id: 1,
                number: "10+",
                unit: "Years",
                description:
                    "A short stat description goes here.",
            },
            {
                id: 2,
                number: "5,000+",
                unit: "",
                description:
                    "A short stat description goes here.",
            },
            {
                id: 3,
                number: "25,000+",
                unit: "",
                description:
                    "A short stat description goes here.",
            },
        ],
        section8clientLogos: [
            { id: 1, image: "/images/placeholder.svg", alt: "Client logo 1" },
            { id: 2, image: "/images/placeholder.svg", alt: "Client logo 2" },
            { id: 3, image: "/images/placeholder.svg", alt: "Client logo 3" },
            { id: 4, image: "/images/placeholder.svg", alt: "Client logo 4" },
            { id: 5, image: "/images/placeholder.svg", alt: "Client logo 5" },
            { id: 6, image: "/images/placeholder.svg", alt: "Client logo 6" },
        ],
        section8testimonials: [
            {
                id: 1,
                quote: "A short placeholder testimonial. Swap in a real quote from a happy customer.",
                author: "Jane Doe",
                role: "Job Title",
                company: "Company One",
            },
            {
                id: 2,
                quote: "A short placeholder testimonial. Swap in a real quote from a happy customer.",
                author: "John Smith",
                role: "Job Title",
                company: "Company Two",
            },
            {
                id: 3,
                quote: "A short placeholder testimonial. Swap in a real quote from a happy customer.",
                author: "Alex Lee",
                role: "Job Title",
                company: "Company Three",
            },
        ],
    },
};
