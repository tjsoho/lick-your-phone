import { homePageFallbackData, HomePageProps } from "@/app/_config";
import HomeAdminInputs from "@/components/admin/home-inputs";
import getPage from "@/server-actions/page";
import { getAvailablePages } from "@/server-actions/navigation";
import { ImageLibraryProvider } from "@/contexts/ImageLibraryContext";

export default async function HomeAdmin() {
	const [homePage, availablePages] = await Promise.all([
		getPage<HomePageProps>("home", homePageFallbackData),
		getAvailablePages(),
	]);

	return (
		<ImageLibraryProvider>
			<div>
				<HomeAdminInputs
					title={homePage.title}
					description={homePage.description}
					slug={homePage.slug}
					content={homePage.content}
					availablePages={availablePages}
				/>
			</div>
		</ImageLibraryProvider>
	);
}
