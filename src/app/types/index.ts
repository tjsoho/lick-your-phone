export type BasePage<TContent> = {
  id?: string;
  title: string;
  description: string;
  slug: string;
  content: TContent;
  created_at?: string;
  updated_at?: string;
};
