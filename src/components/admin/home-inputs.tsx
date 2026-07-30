"use client";

import { useState } from "react";
import { SaveBanner } from "@/components/core/save-banner";
import useUpdatePage from "@/utils/hooks/useUpdatePage";
import {
    AddItemButton,
    AdminPageShell,
    BoldableText,
    FieldGroup,
    IconField,
    ImageInput,
    ListItemCard,
    SectionTitleHeader,
    SectionSidebar,
    PageMetaPanel,
    TextAreaInput,
    TextInput,
    Toggle,
    nextId,
} from "@/components/admin/_shared/form-primitives";
import {
    AdditionalFAQ,
    CarouselItem,
    HomePageContent,
    HomePageProps,
    Section2JourneyCard,
    Section3Card,
    Section4Service,
    Section5ApproachCard,
    Section8ClientLogo,
    Section8Stat,
    Section8Testimonial,
} from "@/app/_config";
import { AvailablePage } from "@/data/navigation";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const NO_LINK_VALUE = "__none__";

type SectionKey =
    | "hero"
    | "section2"
    | "section3"
    | "section4"
    | "section5"
    | "section6"
    | "section7"
    | "section8";

interface HomeAdminInputsProps extends HomePageProps {
    /** Pages available in the hero carousel page picker. */
    availablePages?: AvailablePage[];
}

export default function HomeAdminInputs(props: HomeAdminInputsProps) {
    const c = props.content;

    /* ─── Page meta (URL + SEO) ─── */
    const [metaTitle, setMetaTitle] = useState(props.title || "");
    const [metaDescription, setMetaDescription] = useState(
        props.description || "",
    );

    /* Hero */
    const [heroImage, setHeroImage] = useState(c.heroImage || "");
    const [heroTitle, setHeroTitle] = useState(c.heroTitle || "");
    const [heroTitleBold, setHeroTitleBold] = useState(!!c.heroTitleBold);
    const [heroParagraph, setHeroParagraph] = useState(c.heroParagraph || "");
    const [heroParagraphBold, setHeroParagraphBold] = useState(
        !!c.heroParagraphBold,
    );
    const [heroButton1Text, setHeroButton1Text] = useState(
        c.heroButton1Text || "",
    );
    const [heroButton2Text, setHeroButton2Text] = useState(
        c.heroButton2Text || "",
    );
    const [heroCarousel, setHeroCarousel] = useState<CarouselItem[]>(
        c.heroCarousel || [],
    );

    /* ─── Section visibility flags (eye-toggle in sidebar) ─── */
    const [section2Visible, setSection2Visible] = useState(
        c.section2Visible !== false,
    );
    const [section3Visible, setSection3Visible] = useState(
        c.section3Visible !== false,
    );
    const [section4Visible, setSection4Visible] = useState(
        c.section4Visible !== false,
    );
    const [section5Visible, setSection5Visible] = useState(
        c.section5Visible !== false,
    );
    const [section6Visible, setSection6Visible] = useState(
        c.section6Visible !== false,
    );
    const [section7Visible, setSection7Visible] = useState(
        c.section7Visible !== false,
    );
    const [section8Visible, setSection8Visible] = useState(
        c.section8Visible !== false,
    );

    /* ─── Section ordering (drag-and-drop in sidebar) ─── */
    type OrderableSection = Exclude<SectionKey, "hero">;
    const DEFAULT_ORDER: OrderableSection[] = [
        "section2",
        "section3",
        "section4",
        "section5",
        "section8",
        "section6",
        "section7",
    ];
    const [sectionsOrder, setSectionsOrder] = useState<OrderableSection[]>(
        () => {
            // Honour saved order, but fill in any sections it's missing
            // (e.g. legacy rows saved before this field existed) by
            // appending them in the default order.
            const saved = (c.sectionsOrder || []) as OrderableSection[];
            const known = new Set(saved);
            const filled = [...saved];
            for (const key of DEFAULT_ORDER) {
                if (!known.has(key)) filled.push(key);
            }
            return filled;
        },
    );

    /* Section 2 */
    const [s2subtitle, setS2subtitle] = useState(c.section2subtitle || "");
    const [s2title, setS2title] = useState(c.section2title || "");
    const [s2titleBold, setS2titleBold] = useState(!!c.section2titleBold);
    const [s2paragraph, setS2paragraph] = useState(c.section2paragraph || "");
    const [s2paragraphBold, setS2paragraphBold] = useState(
        !!c.section2paragraphBold,
    );
    const [s2buttonText, setS2buttonText] = useState(c.section2buttonText || "");
    const [s2JourneyCards, setS2JourneyCards] = useState<Section2JourneyCard[]>(
        c.section2JourneyCards || [],
    );

    /* Section 3 */
    const [s3subtitle, setS3subtitle] = useState(c.section3subtitle || "");
    const [s3title, setS3title] = useState(c.section3title || "");
    const [s3titleBold, setS3titleBold] = useState(!!c.section3titleBold);
    const [s3description, setS3description] = useState(
        c.section3description || "",
    );
    const [s3descriptionBold, setS3descriptionBold] = useState(
        !!c.section3descriptionBold,
    );
    const [s3backgroundImage, setS3backgroundImage] = useState(
        c.section3backgroundImage || "",
    );
    const [s3cards, setS3cards] = useState<Section3Card[]>(c.section3cards || []);

    /* Section 4 */
    const [s4subtitle, setS4subtitle] = useState(c.section4subtitle || "");
    const [s4title, setS4title] = useState(c.section4title || "");
    const [s4titleBold, setS4titleBold] = useState(!!c.section4titleBold);
    const [s4description, setS4description] = useState(
        c.section4description || "",
    );
    const [s4descriptionBold, setS4descriptionBold] = useState(
        !!c.section4descriptionBold,
    );
    const [s4services, setS4services] = useState<Section4Service[]>(
        c.section4services || [],
    );

    /* Section 5 */
    const [s5subtitle, setS5subtitle] = useState(c.section5subtitle || "");
    const [s5title, setS5title] = useState(c.section5title || "");
    const [s5titleBold, setS5titleBold] = useState(!!c.section5titleBold);
    const [s5description, setS5description] = useState(
        c.section5description || "",
    );
    const [s5descriptionBold, setS5descriptionBold] = useState(
        !!c.section5descriptionBold,
    );
    const [s5backgroundImage, setS5backgroundImage] = useState(
        c.section5backgroundImage || "",
    );
    const [s5approachCards, setS5approachCards] = useState<
        Section5ApproachCard[]
    >(c.section5approachCards || []);

    /* Section 6 — FAQs */
    const [s6title, setS6title] = useState(c.section6title || "");
    const [s6titleBold, setS6titleBold] = useState(!!c.section6titleBold);
    const [s6faq1q, setS6faq1q] = useState(c.section6faq1question || "");
    const [s6faq1qBold, setS6faq1qBold] = useState(!!c.section6faq1questionBold);
    const [s6faq1a, setS6faq1a] = useState(c.section6faq1answer || "");
    const [s6faq1aBold, setS6faq1aBold] = useState(!!c.section6faq1answerBold);
    const [s6faq2q, setS6faq2q] = useState(c.section6faq2question || "");
    const [s6faq2qBold, setS6faq2qBold] = useState(!!c.section6faq2questionBold);
    const [s6faq2a, setS6faq2a] = useState(c.section6faq2answer || "");
    const [s6faq2aBold, setS6faq2aBold] = useState(!!c.section6faq2answerBold);
    const [s6faq3q, setS6faq3q] = useState(c.section6faq3question || "");
    const [s6faq3qBold, setS6faq3qBold] = useState(!!c.section6faq3questionBold);
    const [s6faq3a, setS6faq3a] = useState(c.section6faq3answer || "");
    const [s6faq3aBold, setS6faq3aBold] = useState(!!c.section6faq3answerBold);
    const [s6faq4q, setS6faq4q] = useState(c.section6faq4question || "");
    const [s6faq4qBold, setS6faq4qBold] = useState(!!c.section6faq4questionBold);
    const [s6faq4a, setS6faq4a] = useState(c.section6faq4answer || "");
    const [s6faq4aBold, setS6faq4aBold] = useState(!!c.section6faq4answerBold);
    const [additionalFaqs, setAdditionalFaqs] = useState<AdditionalFAQ[]>(
        c.additionalSection6Faqs || [],
    );

    /* Section 7 — CTA */
    const [s7subtitle, setS7subtitle] = useState(c.section7subtitle || "");
    const [s7title, setS7title] = useState(c.section7title || "");
    const [s7titleBold, setS7titleBold] = useState(!!c.section7titleBold);
    const [s7description, setS7description] = useState(
        c.section7description || "",
    );
    const [s7descriptionBold, setS7descriptionBold] = useState(
        !!c.section7descriptionBold,
    );
    const [s7backgroundImage, setS7backgroundImage] = useState(
        c.section7backgroundImage || "",
    );
    const [s7button1Text, setS7button1Text] = useState(
        c.section7button1Text || "",
    );
    const [s7button2Text, setS7button2Text] = useState(
        c.section7button2Text || "",
    );

    /* Section 8 — Trusted Nationwide */
    const [s8subtitle, setS8subtitle] = useState(c.section8subtitle || "");
    const [s8title, setS8title] = useState(c.section8title || "");
    const [s8titleBold, setS8titleBold] = useState(!!c.section8titleBold);
    const [s8paragraph, setS8paragraph] = useState(c.section8paragraph || "");
    const [s8paragraphBold, setS8paragraphBold] = useState(
        !!c.section8paragraphBold,
    );
    const [s8stats, setS8stats] = useState<Section8Stat[]>(
        c.section8stats || [],
    );
    const [s8clientLogos, setS8clientLogos] = useState<Section8ClientLogo[]>(
        c.section8clientLogos || [],
    );
    const [s8testimonials, setS8testimonials] = useState<Section8Testimonial[]>(
        c.section8testimonials || [],
    );

    /* Nav + rename */
    const [active, setActive] = useState<SectionKey>("hero");
    const [titles, setTitles] = useState<Record<SectionKey, string>>({
        hero: "Hero",
        section2: "Our Story",
        section3: "Audiences",
        section4: "Services",
        section5: "Approach",
        section6: "FAQs",
        section7: "Get Started CTA",
        section8: "Trusted Nationwide",
    });
    const [editingKey, setEditingKey] = useState<SectionKey | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const headerProps = (key: SectionKey) => ({
        title: titles[key],
        isEditing: editingKey === key,
        editValue: editingValue,
        onEdit: () => {
            setEditingKey(key);
            setEditingValue(titles[key]);
        },
        onSave: () => {
            setTitles((t) => ({ ...t, [key]: editingValue }));
            setEditingKey(null);
        },
        onCancel: () => setEditingKey(null),
        onEditValueChange: setEditingValue,
    });

    /**
     * Section header bar with a visibility toggle on the right. Hidden
     * sections stay editable so admins can prep copy while keeping it
     * off the live page. Hero uses the bare SectionTitleHeader instead.
     */
    const SectionHeader = ({
        keyName,
        visible,
        setVisible,
    }: {
        keyName: Exclude<SectionKey, "hero">;
        visible: boolean;
        setVisible: (v: boolean) => void;
    }) => (
        <div className="flex items-center justify-between gap-3">
            <SectionTitleHeader {...headerProps(keyName)} />
            <Toggle
                id={`${keyName}-visible`}
                label={visible ? "Visible on site" : "Hidden on site"}
                checked={visible}
                onChange={setVisible}
            />
        </div>
    );

    const { isSaving, updatePage } = useUpdatePage<HomePageContent>("home");

    const handleSave = () => {
        // Strip non-row props so they aren't sent to the pages table.
        // availablePages is a client-only prop; the pages table has no such column.
        const { availablePages: _availablePages, ...row } = props;
        void _availablePages;
        return updatePage({
            ...row,
            title: metaTitle || props.title,
            description: metaDescription || props.description,
            content: {
                sectionsOrder,
                section2Visible,
                section3Visible,
                section4Visible,
                section5Visible,
                section6Visible,
                section7Visible,
                section8Visible,
                heroImage,
                heroTitle,
                heroTitleBold,
                heroParagraph,
                heroParagraphBold,
                heroButton1Text,
                heroButton2Text,
                heroCarousel,
                section2subtitle: s2subtitle,
                section2title: s2title,
                section2titleBold: s2titleBold,
                section2paragraph: s2paragraph,
                section2paragraphBold: s2paragraphBold,
                section2buttonText: s2buttonText,
                section2JourneyCards: s2JourneyCards,
                section3subtitle: s3subtitle,
                section3title: s3title,
                section3titleBold: s3titleBold,
                section3description: s3description,
                section3descriptionBold: s3descriptionBold,
                section3backgroundImage: s3backgroundImage,
                section3cards: s3cards,
                section4subtitle: s4subtitle,
                section4title: s4title,
                section4titleBold: s4titleBold,
                section4description: s4description,
                section4descriptionBold: s4descriptionBold,
                section4services: s4services,
                section5subtitle: s5subtitle,
                section5title: s5title,
                section5titleBold: s5titleBold,
                section5description: s5description,
                section5descriptionBold: s5descriptionBold,
                section5backgroundImage: s5backgroundImage,
                section5approachCards: s5approachCards,
                section6title: s6title,
                section6titleBold: s6titleBold,
                section6faq1question: s6faq1q,
                section6faq1questionBold: s6faq1qBold,
                section6faq1answer: s6faq1a,
                section6faq1answerBold: s6faq1aBold,
                section6faq2question: s6faq2q,
                section6faq2questionBold: s6faq2qBold,
                section6faq2answer: s6faq2a,
                section6faq2answerBold: s6faq2aBold,
                section6faq3question: s6faq3q,
                section6faq3questionBold: s6faq3qBold,
                section6faq3answer: s6faq3a,
                section6faq3answerBold: s6faq3aBold,
                section6faq4question: s6faq4q,
                section6faq4questionBold: s6faq4qBold,
                section6faq4answer: s6faq4a,
                section6faq4answerBold: s6faq4aBold,
                additionalSection6Faqs: additionalFaqs,
                section7subtitle: s7subtitle,
                section7title: s7title,
                section7titleBold: s7titleBold,
                section7description: s7description,
                section7descriptionBold: s7descriptionBold,
                section7backgroundImage: s7backgroundImage,
                section7button1Text: s7button1Text,
                section7button2Text: s7button2Text,
                section8subtitle: s8subtitle,
                section8title: s8title,
                section8titleBold: s8titleBold,
                section8paragraph: s8paragraph,
                section8paragraphBold: s8paragraphBold,
                section8stats: s8stats,
                section8clientLogos: s8clientLogos,
                section8testimonials: s8testimonials,
            },
        });
    };

    /* helpers */
    const updateIn = <T extends { id: number }>(
        items: T[],
        id: number,
        patch: Partial<T>,
        setter: (v: T[]) => void,
    ) => setter(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const removeIn = <T extends { id: number }>(
        items: T[],
        id: number,
        setter: (v: T[]) => void,
    ) => setter(items.filter((it) => it.id !== id));
    const updateInStr = <T extends { id: string }>(
        items: T[],
        id: string,
        patch: Partial<T>,
        setter: (v: T[]) => void,
    ) => setter(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const removeInStr = <T extends { id: string }>(
        items: T[],
        id: string,
        setter: (v: T[]) => void,
    ) => setter(items.filter((it) => it.id !== id));

    return (
        <>
            <SaveBanner
                pageTitle="Home"
                onSave={handleSave}
                isSaving={isSaving}
            />
            <AdminPageShell
                sidebar={
                    <div className="flex flex-col gap-3">
                        <SectionSidebar
                            tabs={[
                                { value: "hero", label: titles.hero },
                                ...sectionsOrder.map((key) => ({
                                    value: key,
                                    label: titles[key],
                                })),
                            ]}
                            active={active}
                            onChange={(v) => setActive(v)}
                            // Hero stays first and can't reorder/hide — strip
                            // it from any reorder payload before applying.
                            onReorder={(next) =>
                                setSectionsOrder(
                                    next.filter(
                                        (v) => v !== "hero",
                                    ) as OrderableSection[],
                                )
                            }
                            visibility={{
                                hero: true, // hero always visible — no eye
                                section2: section2Visible,
                                section3: section3Visible,
                                section4: section4Visible,
                                section5: section5Visible,
                                section6: section6Visible,
                                section7: section7Visible,
                                section8: section8Visible,
                            }}
                            onVisibilityChange={(key, visible) => {
                                if (key === "section2") setSection2Visible(visible);
                                else if (key === "section3") setSection3Visible(visible);
                                else if (key === "section4") setSection4Visible(visible);
                                else if (key === "section5") setSection5Visible(visible);
                                else if (key === "section6") setSection6Visible(visible);
                                else if (key === "section7") setSection7Visible(visible);
                                else if (key === "section8") setSection8Visible(visible);
                            }}
                        />
                        <PageMetaPanel
                            url="/"
                            urlLockedReason="Public URL is determined by the folder route in src/app/. Contact a developer to change it."
                            metaTitle={metaTitle}
                            onMetaTitleChange={setMetaTitle}
                            metaDescription={metaDescription}
                            onMetaDescriptionChange={setMetaDescription}
                        />
                    </div>
                }
            >

                {/* HERO */}
                <section className={active === "hero" ? "space-y-4" : "hidden"}>
                    <SectionTitleHeader {...headerProps("hero")} />
                    <FieldGroup title="Hero Image">
                        <ImageInput
                            label="Background image"
                            value={heroImage}
                            onChange={setHeroImage}
                            usage="home-hero"
                        />
                    </FieldGroup>
                    <FieldGroup title="Hero Copy">
                        <BoldableText
                            id="hm-hero-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={heroTitle}
                            onChange={setHeroTitle}
                            bold={heroTitleBold}
                            onBoldChange={setHeroTitleBold}
                        />
                        <BoldableText
                            id="hm-hero-para"
                            label="Paragraph"
                            as="textarea"
                            rows={3}
                            value={heroParagraph}
                            onChange={setHeroParagraph}
                            bold={heroParagraphBold}
                            onBoldChange={setHeroParagraphBold}
                        />
                    </FieldGroup>
                    <FieldGroup title="Hero Buttons">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInput
                                label="Button 1 text"
                                value={heroButton1Text}
                                onChange={setHeroButton1Text}
                            />
                            <TextInput
                                label="Button 2 text"
                                value={heroButton2Text}
                                onChange={setHeroButton2Text}
                            />
                        </div>
                    </FieldGroup>
                    <FieldGroup
                        title="Hero Carousel"
                        description="Image cards in the right column of the hero."
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setHeroCarousel([
                                        ...heroCarousel,
                                        {
                                            id: nextId(heroCarousel),
                                            image: "/images/placeholder.svg",
                                            title: "New card",
                                            pageSlug: "",
                                        },
                                    ])
                                }
                            >
                                Add slide
                            </AddItemButton>
                        }
                    >
                        {heroCarousel.map((item, i) => (
                            <ListItemCard
                                key={item.id}
                                title={`Slide ${i + 1}`}
                                onRemove={() =>
                                    removeIn(heroCarousel, item.id, setHeroCarousel)
                                }
                            >
                                <ImageInput
                                    label="Image"
                                    value={item.image}
                                    onChange={(v) =>
                                        updateIn(
                                            heroCarousel,
                                            item.id,
                                            { image: v },
                                            setHeroCarousel,
                                        )
                                    }
                                />
                                <IconField
                                    id={`hm-carousel-${item.id}-icon`}
                                    label="Icon (optional)"
                                    value={item.icon || ""}
                                    onChange={(v) =>
                                        updateIn(
                                            heroCarousel,
                                            item.id,
                                            { icon: v },
                                            setHeroCarousel,
                                        )
                                    }
                                    enabled={item.showIcon !== false}
                                    onEnabledChange={(v) =>
                                        updateIn(
                                            heroCarousel,
                                            item.id,
                                            { showIcon: v },
                                            setHeroCarousel,
                                        )
                                    }
                                />
                                <TextInput
                                    label="Title"
                                    value={item.title}
                                    onChange={(v) =>
                                        updateIn(
                                            heroCarousel,
                                            item.id,
                                            { title: v },
                                            setHeroCarousel,
                                        )
                                    }
                                />
                                <CarouselPagePicker
                                    value={item.pageSlug || ""}
                                    onChange={(v) =>
                                        updateIn(
                                            heroCarousel,
                                            item.id,
                                            { pageSlug: v },
                                            setHeroCarousel,
                                        )
                                    }
                                    availablePages={
                                        props.availablePages || []
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 2 — Journey */}
                <section className={active === "section2" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section2"
                        visible={section2Visible}
                        setVisible={setSection2Visible}
                    />
                    <FieldGroup title="Heading">
                        <TextInput
                            label="Subtitle"
                            value={s2subtitle}
                            onChange={setS2subtitle}
                        />
                        <BoldableText
                            id="hm-s2-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s2title}
                            onChange={setS2title}
                            bold={s2titleBold}
                            onBoldChange={setS2titleBold}
                        />
                        <BoldableText
                            id="hm-s2-para"
                            label="Paragraph"
                            as="textarea"
                            rows={3}
                            value={s2paragraph}
                            onChange={setS2paragraph}
                            bold={s2paragraphBold}
                            onBoldChange={setS2paragraphBold}
                        />
                        <TextInput
                            label="Button text"
                            value={s2buttonText}
                            onChange={setS2buttonText}
                        />
                    </FieldGroup>
                    <FieldGroup
                        title="Journey Cards"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS2JourneyCards([
                                        ...s2JourneyCards,
                                        {
                                            id: nextId(s2JourneyCards),
                                            image: "/images/placeholder.svg",
                                            title: "New card",
                                            titleBold: false,
                                            description: "Description",
                                            descriptionBold: false,
                                        },
                                    ])
                                }
                            >
                                Add card
                            </AddItemButton>
                        }
                    >
                        {s2JourneyCards.map((card, i) => (
                            <ListItemCard
                                key={card.id}
                                title={`Card ${i + 1}`}
                                onRemove={() =>
                                    removeIn(
                                        s2JourneyCards,
                                        card.id,
                                        setS2JourneyCards,
                                    )
                                }
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ImageInput
                                        label="Image"
                                        value={card.image}
                                        onChange={(v) =>
                                            updateIn(
                                                s2JourneyCards,
                                                card.id,
                                                { image: v },
                                                setS2JourneyCards,
                                            )
                                        }
                                    />
                                    <IconField
                                        id={`hm-s2-card-${card.id}-icon`}
                                        label="Icon (optional)"
                                        value={card.icon || ""}
                                        onChange={(v) =>
                                            updateIn(
                                                s2JourneyCards,
                                                card.id,
                                                { icon: v },
                                                setS2JourneyCards,
                                            )
                                        }
                                        enabled={card.showIcon !== false}
                                        onEnabledChange={(v) =>
                                            updateIn(
                                                s2JourneyCards,
                                                card.id,
                                                { showIcon: v },
                                                setS2JourneyCards,
                                            )
                                        }
                                    />
                                </div>
                                <BoldableText
                                    id={`hm-s2-card-${card.id}-title`}
                                    label="Title"
                                    value={card.title}
                                    onChange={(v) =>
                                        updateIn(
                                            s2JourneyCards,
                                            card.id,
                                            { title: v },
                                            setS2JourneyCards,
                                        )
                                    }
                                    bold={card.titleBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s2JourneyCards,
                                            card.id,
                                            { titleBold: v },
                                            setS2JourneyCards,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s2-card-${card.id}-desc`}
                                    label="Description"
                                    as="textarea"
                                    rows={2}
                                    value={card.description}
                                    onChange={(v) =>
                                        updateIn(
                                            s2JourneyCards,
                                            card.id,
                                            { description: v },
                                            setS2JourneyCards,
                                        )
                                    }
                                    bold={card.descriptionBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s2JourneyCards,
                                            card.id,
                                            { descriptionBold: v },
                                            setS2JourneyCards,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 3 — Audiences */}
                <section className={active === "section3" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section3"
                        visible={section3Visible}
                        setVisible={setSection3Visible}
                    />
                    <FieldGroup title="Heading">
                        <TextInput
                            label="Subtitle"
                            value={s3subtitle}
                            onChange={setS3subtitle}
                        />
                        <BoldableText
                            id="hm-s3-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s3title}
                            onChange={setS3title}
                            bold={s3titleBold}
                            onBoldChange={setS3titleBold}
                        />
                        <BoldableText
                            id="hm-s3-desc"
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={s3description}
                            onChange={setS3description}
                            bold={s3descriptionBold}
                            onBoldChange={setS3descriptionBold}
                        />
                    </FieldGroup>
                    <FieldGroup title="Background image">
                        <ImageInput
                            label="Background image"
                            value={s3backgroundImage}
                            onChange={setS3backgroundImage}
                            usage="home-section3"
                        />
                    </FieldGroup>
                    <FieldGroup
                        title="Audience Cards"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS3cards([
                                        ...s3cards,
                                        {
                                            id: nextId(s3cards),
                                            title: "New card",
                                            titleBold: false,
                                            description: "Description",
                                            descriptionBold: false,
                                            buttonText: "Learn more",
                                        },
                                    ])
                                }
                            >
                                Add card
                            </AddItemButton>
                        }
                    >
                        {s3cards.map((card, i) => (
                            <ListItemCard
                                key={card.id}
                                title={`Card ${i + 1}`}
                                onRemove={() => removeIn(s3cards, card.id, setS3cards)}
                            >
                                <BoldableText
                                    id={`hm-s3-card-${card.id}-title`}
                                    label="Title"
                                    value={card.title}
                                    onChange={(v) =>
                                        updateIn(s3cards, card.id, { title: v }, setS3cards)
                                    }
                                    bold={card.titleBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s3cards,
                                            card.id,
                                            { titleBold: v },
                                            setS3cards,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s3-card-${card.id}-desc`}
                                    label="Description"
                                    as="textarea"
                                    rows={2}
                                    value={card.description}
                                    onChange={(v) =>
                                        updateIn(
                                            s3cards,
                                            card.id,
                                            { description: v },
                                            setS3cards,
                                        )
                                    }
                                    bold={card.descriptionBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s3cards,
                                            card.id,
                                            { descriptionBold: v },
                                            setS3cards,
                                        )
                                    }
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <TextInput
                                        label="Button text"
                                        value={card.buttonText}
                                        onChange={(v) =>
                                            updateIn(
                                                s3cards,
                                                card.id,
                                                { buttonText: v },
                                                setS3cards,
                                            )
                                        }
                                    />
                                    <TextInput
                                        label="Button link"
                                        value={card.buttonLink || ""}
                                        onChange={(v) =>
                                            updateIn(
                                                s3cards,
                                                card.id,
                                                { buttonLink: v },
                                                setS3cards,
                                            )
                                        }
                                        placeholder="/who-we-help"
                                    />
                                </div>
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 4 — Services */}
                <section className={active === "section4" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section4"
                        visible={section4Visible}
                        setVisible={setSection4Visible}
                    />
                    <FieldGroup title="Heading">
                        <TextInput
                            label="Subtitle"
                            value={s4subtitle}
                            onChange={setS4subtitle}
                        />
                        <BoldableText
                            id="hm-s4-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s4title}
                            onChange={setS4title}
                            bold={s4titleBold}
                            onBoldChange={setS4titleBold}
                        />
                        <BoldableText
                            id="hm-s4-desc"
                            label="Description"
                            as="textarea"
                            rows={2}
                            value={s4description}
                            onChange={setS4description}
                            bold={s4descriptionBold}
                            onBoldChange={setS4descriptionBold}
                        />
                    </FieldGroup>
                    <FieldGroup
                        title="Services"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS4services([
                                        ...s4services,
                                        {
                                            id: nextId(s4services),
                                            name: "New service",
                                            nameBold: false,
                                        },
                                    ])
                                }
                            >
                                Add service
                            </AddItemButton>
                        }
                    >
                        {s4services.map((svc, i) => (
                            <ListItemCard
                                key={svc.id}
                                title={`Service ${i + 1}`}
                                onRemove={() =>
                                    removeIn(s4services, svc.id, setS4services)
                                }
                            >
                                <IconField
                                    id={`hm-s4-svc-${svc.id}-icon`}
                                    value={svc.icon || ""}
                                    onChange={(v) =>
                                        updateIn(
                                            s4services,
                                            svc.id,
                                            { icon: v },
                                            setS4services,
                                        )
                                    }
                                    enabled={svc.showIcon !== false}
                                    onEnabledChange={(v) =>
                                        updateIn(
                                            s4services,
                                            svc.id,
                                            { showIcon: v },
                                            setS4services,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s4-svc-${svc.id}`}
                                    label="Name"
                                    value={svc.name}
                                    onChange={(v) =>
                                        updateIn(
                                            s4services,
                                            svc.id,
                                            { name: v },
                                            setS4services,
                                        )
                                    }
                                    bold={svc.nameBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s4services,
                                            svc.id,
                                            { nameBold: v },
                                            setS4services,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 5 — Approach */}
                <section className={active === "section5" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section5"
                        visible={section5Visible}
                        setVisible={setSection5Visible}
                    />
                    <FieldGroup title="Heading">
                        <TextInput
                            label="Subtitle"
                            value={s5subtitle}
                            onChange={setS5subtitle}
                        />
                        <BoldableText
                            id="hm-s5-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s5title}
                            onChange={setS5title}
                            bold={s5titleBold}
                            onBoldChange={setS5titleBold}
                        />
                        <BoldableText
                            id="hm-s5-desc"
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={s5description}
                            onChange={setS5description}
                            bold={s5descriptionBold}
                            onBoldChange={setS5descriptionBold}
                        />
                    </FieldGroup>
                    <FieldGroup title="Background image">
                        <ImageInput
                            label="Background image"
                            value={s5backgroundImage}
                            onChange={setS5backgroundImage}
                            usage="home-section5"
                        />
                    </FieldGroup>
                    <FieldGroup
                        title="Approach Cards"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS5approachCards([
                                        ...s5approachCards,
                                        {
                                            id: nextId(s5approachCards),
                                            title: "New card",
                                            titleBold: false,
                                            description: "Description",
                                            descriptionBold: false,
                                        },
                                    ])
                                }
                            >
                                Add card
                            </AddItemButton>
                        }
                    >
                        {s5approachCards.map((card, i) => (
                            <ListItemCard
                                key={card.id}
                                title={`Card ${i + 1}`}
                                onRemove={() =>
                                    removeIn(
                                        s5approachCards,
                                        card.id,
                                        setS5approachCards,
                                    )
                                }
                            >
                                <IconField
                                    id={`hm-s5-card-${card.id}-icon`}
                                    value={card.icon || ""}
                                    onChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { icon: v },
                                            setS5approachCards,
                                        )
                                    }
                                    enabled={card.showIcon !== false}
                                    onEnabledChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { showIcon: v },
                                            setS5approachCards,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s5-card-${card.id}-title`}
                                    label="Title"
                                    value={card.title}
                                    onChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { title: v },
                                            setS5approachCards,
                                        )
                                    }
                                    bold={card.titleBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { titleBold: v },
                                            setS5approachCards,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s5-card-${card.id}-desc`}
                                    label="Description"
                                    as="textarea"
                                    rows={2}
                                    value={card.description}
                                    onChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { description: v },
                                            setS5approachCards,
                                        )
                                    }
                                    bold={card.descriptionBold}
                                    onBoldChange={(v) =>
                                        updateIn(
                                            s5approachCards,
                                            card.id,
                                            { descriptionBold: v },
                                            setS5approachCards,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 6 — FAQs */}
                <section className={active === "section6" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section6"
                        visible={section6Visible}
                        setVisible={setSection6Visible}
                    />
                    <FieldGroup title="Heading">
                        <BoldableText
                            id="hm-s6-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s6title}
                            onChange={setS6title}
                            bold={s6titleBold}
                            onBoldChange={setS6titleBold}
                        />
                    </FieldGroup>
                    {(
                        [
                            ["1", s6faq1q, setS6faq1q, s6faq1qBold, setS6faq1qBold, s6faq1a, setS6faq1a, s6faq1aBold, setS6faq1aBold],
                            ["2", s6faq2q, setS6faq2q, s6faq2qBold, setS6faq2qBold, s6faq2a, setS6faq2a, s6faq2aBold, setS6faq2aBold],
                            ["3", s6faq3q, setS6faq3q, s6faq3qBold, setS6faq3qBold, s6faq3a, setS6faq3a, s6faq3aBold, setS6faq3aBold],
                            ["4", s6faq4q, setS6faq4q, s6faq4qBold, setS6faq4qBold, s6faq4a, setS6faq4a, s6faq4aBold, setS6faq4aBold],
                        ] as const
                    ).map(([n, q, setQ, qBold, setQBold, a, setA, aBold, setABold]) => (
                        <FieldGroup key={n} title={`FAQ ${n}`}>
                            <BoldableText
                                id={`hm-s6-faq${n}-q`}
                                label="Question"
                                as="textarea"
                                rows={2}
                                value={q}
                                onChange={setQ}
                                bold={qBold}
                                onBoldChange={setQBold}
                            />
                            <BoldableText
                                id={`hm-s6-faq${n}-a`}
                                label="Answer"
                                as="textarea"
                                rows={3}
                                value={a}
                                onChange={setA}
                                bold={aBold}
                                onBoldChange={setABold}
                            />
                        </FieldGroup>
                    ))}
                    <FieldGroup
                        title="Additional FAQs"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setAdditionalFaqs([
                                        ...additionalFaqs,
                                        {
                                            id: `faq-${Date.now()}`,
                                            question: "New question",
                                            questionBold: false,
                                            answer: "Answer",
                                            answerBold: false,
                                        },
                                    ])
                                }
                            >
                                Add FAQ
                            </AddItemButton>
                        }
                    >
                        {additionalFaqs.map((faq, i) => (
                            <ListItemCard
                                key={faq.id}
                                title={`FAQ ${i + 5}`}
                                onRemove={() =>
                                    removeInStr(
                                        additionalFaqs,
                                        faq.id,
                                        setAdditionalFaqs,
                                    )
                                }
                            >
                                <BoldableText
                                    id={`hm-s6-add-${faq.id}-q`}
                                    label="Question"
                                    as="textarea"
                                    rows={2}
                                    value={faq.question}
                                    onChange={(v) =>
                                        updateInStr(
                                            additionalFaqs,
                                            faq.id,
                                            { question: v },
                                            setAdditionalFaqs,
                                        )
                                    }
                                    bold={faq.questionBold}
                                    onBoldChange={(v) =>
                                        updateInStr(
                                            additionalFaqs,
                                            faq.id,
                                            { questionBold: v },
                                            setAdditionalFaqs,
                                        )
                                    }
                                />
                                <BoldableText
                                    id={`hm-s6-add-${faq.id}-a`}
                                    label="Answer"
                                    as="textarea"
                                    rows={3}
                                    value={faq.answer}
                                    onChange={(v) =>
                                        updateInStr(
                                            additionalFaqs,
                                            faq.id,
                                            { answer: v },
                                            setAdditionalFaqs,
                                        )
                                    }
                                    bold={faq.answerBold}
                                    onBoldChange={(v) =>
                                        updateInStr(
                                            additionalFaqs,
                                            faq.id,
                                            { answerBold: v },
                                            setAdditionalFaqs,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>

                {/* SECTION 7 — CTA */}
                <section className={active === "section7" ? "space-y-4" : "hidden"}>
                    <SectionHeader
                        keyName="section7"
                        visible={section7Visible}
                        setVisible={setSection7Visible}
                    />
                    <FieldGroup title="Background">
                        <ImageInput
                            label="Background image"
                            value={s7backgroundImage}
                            onChange={setS7backgroundImage}
                            usage="home-cta"
                        />
                    </FieldGroup>
                    <FieldGroup title="Copy">
                        <TextInput
                            label="Subtitle"
                            value={s7subtitle}
                            onChange={setS7subtitle}
                        />
                        <BoldableText
                            id="hm-s7-title"
                            label="Title"
                            as="textarea"
                            rows={2}
                            value={s7title}
                            onChange={setS7title}
                            bold={s7titleBold}
                            onBoldChange={setS7titleBold}
                        />
                        <BoldableText
                            id="hm-s7-desc"
                            label="Description"
                            as="textarea"
                            rows={3}
                            value={s7description}
                            onChange={setS7description}
                            bold={s7descriptionBold}
                            onBoldChange={setS7descriptionBold}
                        />
                    </FieldGroup>
                    <FieldGroup title="Buttons">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextInput
                                label="Button 1 text"
                                value={s7button1Text}
                                onChange={setS7button1Text}
                            />
                            <TextInput
                                label="Button 2 text"
                                value={s7button2Text}
                                onChange={setS7button2Text}
                            />
                        </div>
                    </FieldGroup>
                </section>

                {/* SECTION 8 — Trusted Nationwide */}
                <section className={active === "section8" ? "space-y-4" : "hidden"}>
                    <SectionTitleHeader {...headerProps("section8")} />
                    <FieldGroup title="Heading">
                        <BoldableText
                            id="s8-subtitle"
                            label="Subtitle"
                            value={s8subtitle}
                            onChange={setS8subtitle}
                            bold={false}
                            onBoldChange={() => {}}
                        />
                        <BoldableText
                            id="s8-title"
                            label="Title"
                            value={s8title}
                            onChange={setS8title}
                            bold={s8titleBold}
                            onBoldChange={setS8titleBold}
                        />
                        <BoldableText
                            id="s8-paragraph"
                            label="Paragraph"
                            as="textarea"
                            rows={4}
                            value={s8paragraph}
                            onChange={setS8paragraph}
                            bold={s8paragraphBold}
                            onBoldChange={setS8paragraphBold}
                        />
                    </FieldGroup>
                    <FieldGroup
                        title="Statistics"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS8stats([
                                        ...s8stats,
                                        {
                                            id: nextId(s8stats),
                                            number: "0+",
                                            unit: "",
                                            description: "Describe this stat.",
                                        },
                                    ])
                                }
                            >
                                Add stat
                            </AddItemButton>
                        }
                    >
                        {s8stats.map((stat, i) => (
                            <ListItemCard
                                key={stat.id}
                                title={`Stat ${i + 1}`}
                                onRemove={() =>
                                    removeIn(s8stats, stat.id, setS8stats)
                                }
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <TextInput
                                        label="Number"
                                        value={stat.number}
                                        onChange={(v) =>
                                            updateIn(
                                                s8stats,
                                                stat.id,
                                                { number: v },
                                                setS8stats,
                                            )
                                        }
                                        placeholder="10+"
                                    />
                                    <TextInput
                                        label="Unit (optional)"
                                        value={stat.unit || ""}
                                        onChange={(v) =>
                                            updateIn(
                                                s8stats,
                                                stat.id,
                                                { unit: v },
                                                setS8stats,
                                            )
                                        }
                                        placeholder="Years"
                                    />
                                </div>
                                <TextAreaInput
                                    label="Description"
                                    rows={2}
                                    value={stat.description}
                                    onChange={(v) =>
                                        updateIn(
                                            s8stats,
                                            stat.id,
                                            { description: v },
                                            setS8stats,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                    <FieldGroup
                        title="Client logos"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS8clientLogos([
                                        ...s8clientLogos,
                                        {
                                            id: nextId(s8clientLogos),
                                            image: "/images/placeholder.svg",
                                            alt: "Client logo",
                                        },
                                    ])
                                }
                            >
                                Add logo
                            </AddItemButton>
                        }
                    >
                        {s8clientLogos.map((logo, i) => (
                            <ListItemCard
                                key={logo.id}
                                title={`Logo ${i + 1}`}
                                onRemove={() =>
                                    removeIn(
                                        s8clientLogos,
                                        logo.id,
                                        setS8clientLogos,
                                    )
                                }
                            >
                                <ImageInput
                                    label="Logo image"
                                    value={logo.image}
                                    onChange={(v) =>
                                        updateIn(
                                            s8clientLogos,
                                            logo.id,
                                            { image: v },
                                            setS8clientLogos,
                                        )
                                    }
                                    aspect="wide"
                                />
                                <TextInput
                                    label="Alt text"
                                    value={logo.alt}
                                    onChange={(v) =>
                                        updateIn(
                                            s8clientLogos,
                                            logo.id,
                                            { alt: v },
                                            setS8clientLogos,
                                        )
                                    }
                                />
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                    <FieldGroup
                        title="Testimonials"
                        toolbar={
                            <AddItemButton
                                onClick={() =>
                                    setS8testimonials([
                                        ...s8testimonials,
                                        {
                                            id: nextId(s8testimonials),
                                            quote: "New testimonial quote.",
                                            author: "Author name",
                                            role: "Role",
                                            company: "Company",
                                        },
                                    ])
                                }
                            >
                                Add testimonial
                            </AddItemButton>
                        }
                    >
                        {s8testimonials.map((t, i) => (
                            <ListItemCard
                                key={t.id}
                                title={`Testimonial ${i + 1}`}
                                onRemove={() =>
                                    removeIn(
                                        s8testimonials,
                                        t.id,
                                        setS8testimonials,
                                    )
                                }
                            >
                                <TextAreaInput
                                    label="Quote"
                                    rows={3}
                                    value={t.quote}
                                    onChange={(v) =>
                                        updateIn(
                                            s8testimonials,
                                            t.id,
                                            { quote: v },
                                            setS8testimonials,
                                        )
                                    }
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <TextInput
                                        label="Author"
                                        value={t.author}
                                        onChange={(v) =>
                                            updateIn(
                                                s8testimonials,
                                                t.id,
                                                { author: v },
                                                setS8testimonials,
                                            )
                                        }
                                    />
                                    <TextInput
                                        label="Role"
                                        value={t.role}
                                        onChange={(v) =>
                                            updateIn(
                                                s8testimonials,
                                                t.id,
                                                { role: v },
                                                setS8testimonials,
                                            )
                                        }
                                    />
                                    <TextInput
                                        label="Company"
                                        value={t.company}
                                        onChange={(v) =>
                                            updateIn(
                                                s8testimonials,
                                                t.id,
                                                { company: v },
                                                setS8testimonials,
                                            )
                                        }
                                    />
                                </div>
                            </ListItemCard>
                        ))}
                    </FieldGroup>
                </section>
            </AdminPageShell>
        </>
    );
}

/**
 * CarouselPagePicker — shadcn Select listing all pages an admin can link a
 * hero carousel slide to. Mirrors RelatedPagePicker from service-page-inputs
 * but adds a "No link" sentinel so admins can leave a slide as a plain
 * image. Selecting "No link" stores pageSlug as an empty string.
 */
function CarouselPagePicker({
    value,
    onChange,
    availablePages,
}: {
    value: string;
    onChange: (v: string) => void;
    availablePages: AvailablePage[];
}) {
    const groups: Record<string, AvailablePage[]> = {
        Core: [],
        Service: [],
        Legal: [],
    };
    for (const page of availablePages) groups[page.group].push(page);

    const known = availablePages.some((p) => p.path === value);
    const showOther = value && !known;

    // Use the sentinel for empty string in the Select since shadcn/Radix
    // Select doesn't allow "" as a valid item value.
    const selectValue = value === "" ? NO_LINK_VALUE : value;

    return (
        <div>
            <div className="text-xs font-semibold text-brand-black/70 mb-1.5 uppercase tracking-wider">
                Links to
            </div>
            <Select
                value={selectValue}
                onValueChange={(v) =>
                    onChange(v === NO_LINK_VALUE ? "" : v)
                }
            >
                <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a page…" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NO_LINK_VALUE}>
                        No link
                    </SelectItem>
                    {showOther && (
                        <SelectGroup>
                            <SelectLabel>Other</SelectLabel>
                            <SelectItem value={value}>
                                {value} (custom)
                            </SelectItem>
                        </SelectGroup>
                    )}
                    {(["Core", "Service", "Legal"] as const).map((group) =>
                        groups[group].length === 0 ? null : (
                            <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {groups[group].map((page) => (
                                    <SelectItem
                                        key={page.path}
                                        value={page.path}
                                    >
                                        {page.label}{" "}
                                        <span className="text-brand-black/50 font-mono text-xs">
                                            {page.path}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ),
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
