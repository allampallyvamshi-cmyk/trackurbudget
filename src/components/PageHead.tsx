import { Helmet } from "react-helmet-async";

interface PageHeadProps {
  title: string;
  description?: string;
}

const PageHead = ({ title, description }: PageHeadProps) => (
  <Helmet>
    <title>{title} — TrackYourBudget</title>
    {description && <meta name="description" content={description} />}
  </Helmet>
);

export default PageHead;
