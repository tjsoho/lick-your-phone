import NavigationInputs from "@/components/admin/navigation-inputs";
import {
    getAvailablePages,
    getNavigation,
} from "@/server-actions/navigation";

export const dynamic = "force-dynamic";

export default async function NavigationAdminRoute() {
    const [items, availablePages] = await Promise.all([
        getNavigation(),
        getAvailablePages(),
    ]);

    return (
        <NavigationInputs
            initialItems={items}
            availablePages={availablePages}
        />
    );
}
