import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OptOutPage() {
  return (
    <section className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Recruiter opt-out</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            If you are a recruiter and want your contact removed, email{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="mailto:vv.bheemreddy@gmail.com"
            >
              vv.bheemreddy@gmail.com
            </a>{" "}
            with your work email and company name.
          </p>
          <p>We process removal requests manually and remove matching entries promptly.</p>
        </CardContent>
      </Card>
    </section>
  );
}
