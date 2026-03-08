import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, this would query the database for recent activity
    // For now, we'll simulate live activity data
    
    const timestamp = new Date().toISOString();
    
    // Simulate recent events (in production, this would come from database queries)
    const recentEvents = [
      {
        id: "1",
        type: "candidate_evaluated",
        description: "John Doe evaluated for Frontend Developer",
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        severity: "info"
      },
      {
        id: "2", 
        type: "candidate_added",
        description: "Jane Smith added to Backend Developer pipeline",
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        severity: "info"
      },
      {
        id: "3",
        type: "risk_detected",
        description: "High risk detected for Senior Engineer position",
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        severity: "warning"
      }
    ];

    // Simulate activity count (in production, this would be a real count)
    const activityCount = Math.floor(Math.random() * 10) + 1;

    // Add caching headers for better performance
    const headers = new Headers({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "CDN-Cache-Control": "no-cache",
    });

    return NextResponse.json({
      success: true,
      timestamp,
      activityCount,
      recentEvents: recentEvents.slice(0, 5), // Limit to 5 most recent
      status: "live",
      metrics: {
        evaluationsLastHour: Math.floor(Math.random() * 5),
        candidatesAddedToday: Math.floor(Math.random() * 3) + 1,
        risksDetected: Math.floor(Math.random() * 2),
      }
    }, { headers });

  } catch (error) {
    console.error("Live activity API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch live activity",
        timestamp: new Date().toISOString(),
        status: "error"
      },
      { status: 500 }
    );
  }
}
