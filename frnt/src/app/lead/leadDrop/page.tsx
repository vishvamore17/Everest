"use client";
import React, { useEffect, useState } from "react";
import { Card, CardBody, CardFooter } from "@heroui/react";

interface Lead {
  _id: string;
  companyName: string;
  customerName: string;
  amount: number;
  productName: string;
  contactNumber: string;
  emailAddress: string;
  address: string;
  notes: string;
  date: string;
  endDate: string;
  status: "New" | "Discussion" | "Demo" | "Proposal" | "Decided";
  isActive: boolean;
}

// API call to fetch leads
const getAllLeads = async (): Promise<Lead[]> => {
  try {
    const response = await fetch("http://localhost:8000/api/v1/lead/getAllLeads");
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error fetching leads:", error);
    throw new Error("Failed to fetch leads");
  }
};

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [groupedLeads, setGroupedLeads] = useState<Record<string, Lead[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const fetchedLeads = await getAllLeads();
        setLeads(fetchedLeads);
        groupLeadsByStatus(fetchedLeads);
      } catch (error) {
        setError(error.message);
      }
    };
    fetchLeads();
  }, []);

  // Group leads by status
  const groupLeadsByStatus = (leads: Lead[]) => {
    const grouped = leads.reduce((acc, lead) => {
      if (!acc[lead.status]) {
        acc[lead.status] = [];
      }
      acc[lead.status].push(lead);
      return acc;
    }, {} as Record<string, Lead[]>);

    setGroupedLeads(grouped);
  };

  // Define status colors
  const statusColors: Record<string, string> = {
    New: "bg-blue-100 text-blue-800",
    Discussion: "bg-yellow-100 text-yellow-800",
    Demo: "bg-purple-100 text-purple-800",
    Proposal: "bg-orange-100 text-orange-800",
    Decided: "bg-green-100 text-green-800",
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead, fromStatus: string) => {
    e.dataTransfer.setData("lead", JSON.stringify(lead));
    e.dataTransfer.setData("fromStatus", fromStatus);
  };

  const handleDrop = async (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    const lead: Lead = JSON.parse(e.dataTransfer.getData("lead"));
    const fromStatus: string = e.dataTransfer.getData("fromStatus");

    // Prevent dropping into the same status
    if (fromStatus === toStatus) {
      console.warn("Cannot drop into the same category.");
      return;
    }

    // Update the status of the lead in the local state immediately
    const updatedLead = { ...lead, status: toStatus };
    setGroupedLeads((prev) => {
      const fromLeads = prev[fromStatus].filter((l) => l._id !== lead._id);
      const toLeads = [...(prev[toStatus] || []), updatedLead];

      return {
        ...prev,
        [fromStatus]: fromLeads,
        [toStatus]: toLeads,
      };
    });

    try {
      // Send updated status to the backend
      const response = await fetch("http://localhost:8000/api/v1/lead/updateLeadStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead._id,
          status: toStatus,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback if server update fails
        setGroupedLeads((prev) => {
          const toLeads = prev[toStatus].filter((l) => l._id !== lead._id);
          const fromLeads = [...(prev[fromStatus] || []), lead];
          return {
            ...prev,
            [fromStatus]: fromLeads,
            [toStatus]: toLeads,
          };
        });
        console.error("Failed to update lead status on server.");
      }
    } catch (error) {
      console.error("Error updating lead status:", error);
      // Rollback if an error occurs during the fetch
      setGroupedLeads((prev) => {
        const toLeads = prev[toStatus].filter((l) => l._id !== lead._id);
        const fromLeads = [...(prev[fromStatus] || []), lead];
        return {
          ...prev,
          [fromStatus]: fromLeads,
          [toStatus]: toLeads,
        };
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="p-6">
      {/* Show error if there's any */}
      {error && <p className="text-red-500 text-center">{error}</p>}

 

      {/* Leads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {Object.keys(statusColors).map((status) => (
          <div
            key={status}
            className="p-4 bg-black-100 rounded-lg shadow-md min-h-[300px]"
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <h2 className={`text-lg font-bold mb-4 px-5 py-2 rounded-lg ${statusColors[status]}`}>
              {status}
            </h2>

            <div className="space-y-4">
              {groupedLeads[status] && groupedLeads[status].length > 0 ? (
                groupedLeads[status].map((lead) => (
                  <div
                    key={lead._id}
                    className="border border-gray-300 rounded-lg shadow-md p-0 bg-white"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead, status)}
                  >
                    <Card
                      isPressable
                      shadow="sm"
                      onPress={() => console.log(`Lead clicked: ${lead.customerName}`)}
                      className="p-4"
                    >
                      <CardBody className="p-0 space-y-3">
                        <p className="text-lg font-bold text-gray-900">{lead.customerName}</p>
                        <p className="text-sm text-gray-500">{lead.companyName}</p>
                        <p className="text-sm text-gray-700">
                          Product: <span className="font-medium">{lead.productName}</span>
                        </p>
                        <p className="text-sm text-gray-700">
                          End Date: <span className="font-medium">{lead.endDate}</span>
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          Amount: <span className="text-green-600">${lead.amount}</span>
                        </p>
                      </CardBody>
                      <CardFooter className="flex justify-between items-center p-3 border-t border-gray-200">
                        <span className="text-gray-600 text-sm">Status:</span>
                        <span
                          className={`px-4 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}
                        >
                          {status}
                        </span>
                      </CardFooter>
                    </Card>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center">No leads available</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
