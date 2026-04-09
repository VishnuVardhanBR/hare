import Link from "next/link";

import { AdminBulkUpload } from "@/components/AdminBulkUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminEmail, requireSession } from "@/lib/session";

export default async function AdminBulkUploadPage() {
  const session = await requireSession();

  if (!isAdminEmail(session.user.email)) {
    return (
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Admin only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Your account is not listed in ADMIN_EMAILS.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Bulk upload recruiter emails</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only CSV import for recruiter contact data.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to admin panel</Link>
        </Button>
      </div>

      <AdminBulkUpload />
    </section>
  );
}
