import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import FeaturedCard from "@/components/FeaturedCard";
import NewsletterForm from "@/components/NewsletterForm";
import Button from "@/components/Button";
import { articles } from "@/data/articles";

const Index = () => {
  const [visibleArticles, setVisibleArticles] = useState(6);

  const loadMore = () => {
    setVisibleArticles((prev) => Math.min(prev + 3, articles.length));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="px-5 md:px-20 pt-12 md:pt-20 pb-8 md:pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-[120px] font-extrabold uppercase text-center mb-10 max-[700px]:mb-[30px] leading-[0.72] tracking-[-2px] max-[700px]:tracking-[-1px]">
              VESPER
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-foreground/80 max-w-3xl mx-auto mb-8 font-serif">
              I'm a fashion curator sharing my passion for timeless style,
              sustainable design, and the stories behind what we wear. From
              building capsule wardrobes to discovering emerging designers, this
              is where we celebrate fashion as a form of self-expression and
              mindful creativity.
            </p>

            {/* Newsletter CTA */}
            <NewsletterForm
              className="max-w-3xl mx-auto justify-center"
              inputClassName="border-b-2"
            />
          </div>
        </section>

        {/* Featured Card */}
        <section className="px-5 md:px-20 pb-8 md:pb-12">
          <FeaturedCard {...articles[0]} />
        </section>

        {/* Articles Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-5 gap-x-5 gap-y-8 md:pt-16 md:px-20 md:pb-8 md:gap-x-16 md:gap-y-8">
          {articles.slice(1, visibleArticles).map((article) => (
            <ArticleCard key={article.id} {...article} />
          ))}
        </section>

        {/* Load More */}
        {visibleArticles < articles.length && (
          <div className="text-center py-12">
            <Button onClick={loadMore} variant="transparent">
              LOAD MORE
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
