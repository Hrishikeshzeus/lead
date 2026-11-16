"use client";

import * as React from "react";
import { useState } from "react";
import { Building2, School, Globe, Mail, Phone, MapPin, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { onboardInstituteAction } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto generate clean slug
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await onboardInstituteAction(null, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl space-y-6 animate-in fade-in-50">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Institute Onboarding
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Register your educational institution. You will automatically be granted the{" "}
            <span className="font-semibold text-foreground">Institute Admin</span> role.
          </p>
        </div>

        <Card className="border-border shadow-md">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Institution Workspace Profile</CardTitle>
                <Badge variant="success" className="gap-1 text-[11px]">
                  <ShieldCheck className="h-3 w-3" /> Owner Account
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Configure your unique institute namespace and contact endpoints for applicants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Institute Full Name *</Label>
                <div className="relative">
                  <School className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Apex Institute of Technology"
                    className="pl-9 h-9"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Institute Slug / Workspace Identifier *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="e.g. apex-tech"
                    className="pl-9 h-9 font-mono text-xs"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Portal URL: admitflow.internal/<span className="text-primary font-bold">{slug || "your-slug"}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">Admissions Office Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      placeholder="admissions@apex.edu"
                      className="pl-9 h-9"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="+1 (555) 0100"
                      className="pl-9 h-9"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Campus Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    name="address"
                    placeholder="100 Tech Boulevard, Boston, MA"
                    className="pl-9 h-9"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Multi-Tenant Role Isolation Notice
                </div>
                <p>
                  As the founding administrator, your account is bound to this tenant. You will have authority to invite counselors, configure academic courses, and manage applicant admissions.
                </p>
              </div>

              <Button type="submit" className="w-full gap-2 mt-2" isLoading={loading}>
                Complete Onboarding & Enter Workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
