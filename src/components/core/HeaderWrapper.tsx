/* ************************************************************
   Server component wrapper for Header.
   Fetches the header CTA text from the home page content and the
   navigation tree from the DB (falling back to defaults).
************************************************************ */
import getPage from "@/server-actions/page";
import { homePageFallbackData, HomePageProps } from "@/app/_config";
import { getNavigation } from "@/server-actions/navigation";
import Header from "./Header";

export default async function HeaderWrapper() {
    const [homePage, navItems] = await Promise.all([
        getPage<HomePageProps>("home", homePageFallbackData),
        getNavigation(),
    ]);

    return (
        <Header
            headerButtonText={homePage.content.heroButton1Text}
            navItems={navItems}
        />
    );
}
