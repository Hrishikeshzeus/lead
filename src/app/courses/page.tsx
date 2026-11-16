"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  BookOpen,
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Archive,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseFormModal } from "@/components/modals/course-form-modal";
import {
  CourseRecord,
  CourseFilterParams,
  AdmissionAvailability,
} from "@/types/course";
import {
  getCoursesAction,
  toggleCoursePublishAction,
  archiveCourseAction,
} from "@/app/actions/courses";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [publishFilter, setPublishFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<CourseRecord | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: CourseFilterParams = {
        search: searchTerm.trim() || undefined,
        examCategory: selectedCategory !== "all" ? selectedCategory : undefined,
        admissionAvailability:
          availabilityFilter !== "all"
            ? (availabilityFilter as AdmissionAvailability)
            : undefined,
        isPublished:
          publishFilter === "published"
            ? true
            : publishFilter === "unpublished"
            ? false
            : "all",
        isArchived: showArchived,
      };

      const res = await getCoursesAction(params);
      if (res.success && res.data) {
        setCourses(res.data);
      } else {
        setError(res.error || "Failed to load courses.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with course catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory, availabilityFilter, publishFilter, showArchived]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleTogglePublish = async (course: CourseRecord) => {
    const nextState = !course.isPublished;
    const res = await toggleCoursePublishAction(course.id, nextState);
    if (res.success) {
      fetchCourses();
    } else {
      alert(res.error || "Failed to update publish state");
    }
  };

  const handleArchive = async (course: CourseRecord) => {
    const nextState = !course.isArchived;
    const res = await archiveCourseAction(course.id, nextState);
    if (res.success) {
      fetchCourses();
    } else {
      alert(res.error || "Failed to update archive status");
    }
  };

  const getStatusBadge = (status: AdmissionAvailability) => {
    switch (status) {
      case "open":
        return <Badge variant="success">Open for Apps</Badge>;
      case "closing_soon":
        return <Badge variant="warning">Closing Soon</Badge>;
      case "waitlist":
        return <Badge variant="destructive">Waitlist Only</Badge>;
      default:
        return <Badge variant="outline">Closed</Badge>;
    }
  };

  const activeCourses = courses.filter((c) => !c.isArchived);
  const publishedCourses = courses.filter((c) => c.isPublished && !c.isArchived);

  // Extract unique categories
  const categories = Array.from(new Set(courses.map((c) => c.examCategory).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Academic Programs & Offerings
            </h1>
            <Badge variant="outline" className="text-xs">
              {courses.length} Programs
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Program catalog, approved tuition fee schedules, admissions eligibility, and AI knowledge visibility.
          </p>
        </div>

        <Button
          onClick={() => {
            setCourseToEdit(null);
            setModalOpen(true);
          }}
          className="gap-1.5 self-start sm:self-auto h-9"
        >
          <Plus className="h-4 w-4" /> Add Academic Program
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Program Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Active Programs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {activeCourses.length} Offerings
            </div>
            <p className="text-xs text-muted-foreground mt-1">Undergraduate & Graduate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Published & AI Accessible
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">
              {publishedCourses.length} Published
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active in prospective applicant inquiries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Draft / Unpublished
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">
              {activeCourses.length - publishedCourses.length} Drafts
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hidden from AI until reviewed & published
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by program name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Exam Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <option value="all">All Availabilities</option>
                <option value="open">Open for Applications</option>
                <option value="closing_soon">Closing Soon</option>
                <option value="waitlist">Waitlist Only</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                value={publishFilter}
                onChange={(e) => setPublishFilter(e.target.value)}
              >
                <option value="all">All Publish States</option>
                <option value="published">Published Only</option>
                <option value="unpublished">Draft / Unpublished Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Show Archived Courses</span>
            </label>
            <span>Showing {courses.length} courses</span>
          </div>
        </CardContent>
      </Card>

      {/* Courses Catalog Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading academic catalog...</p>
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Academic Programs Found"
              description="No programs match your active search filters or category criteria."
              actionLabel="Add Academic Program"
              onAction={() => {
                setCourseToEdit(null);
                setModalOpen(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px]">Program Name & Details</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Approved Fee Schedule</TableHead>
                    <TableHead>Batch & Campus</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>AI Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-xs">{course.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{course.duration || "Standard"}</span>
                            {course.isArchived && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                Archived
                              </Badge>
                            )}
                          </div>
                          {course.eligibility && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={course.eligibility}>
                              Eligibility: {course.eligibility}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {course.examCategory}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-foreground">
                            {course.feeCurrency} {course.feeAmount.toLocaleString()}
                            <span className="text-muted-foreground font-normal text-[11px]">
                              {" "}/ {course.feePeriod.replace("_", " ")}
                            </span>
                          </p>
                          {course.approvedFeeInfo && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={course.approvedFeeInfo}>
                              {course.approvedFeeInfo}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1 text-foreground">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[150px]">{course.batchSchedule || "Regular"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{course.location || "Campus"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(course.admissionAvailability)}</TableCell>

                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(course)}
                          className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                          title="Click to toggle AI visibility"
                        >
                          {course.isPublished ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              <span className="font-semibold text-emerald-600 text-[11px]">Published</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-muted-foreground text-[11px]">Unpublished</span>
                            </>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Edit Program"
                            onClick={() => {
                              setCourseToEdit(course);
                              setModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={course.isArchived ? "Restore Course" : "Archive Course"}
                            onClick={() => handleArchive(course)}
                          >
                            {course.isArchived ? (
                              <RotateCcw className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Archive className="h-4 w-4 text-muted-foreground hover:text-rose-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Create / Edit Modal */}
      <CourseFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        courseToEdit={courseToEdit}
        onSuccess={() => {
          fetchCourses();
        }}
      />
    </div>
  );
}
