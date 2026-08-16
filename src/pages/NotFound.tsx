import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { locale } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-foreground/20">404</h1>
        <p className="text-xl text-muted-foreground">
          {locale === 'fa' ? 'صفحه مورد نظر یافت نشد' : 'Page not found'}
        </p>
        <Button variant="ghost-ios" asChild>
          <Link to="/">
            {locale === 'fa' ? 'بازگشت به خانه' : 'Return to Home'}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
