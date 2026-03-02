import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';

const BASE = 'https://api.apollo.io/v1';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Api-Key': env.APOLLO_API_KEY,
};

export interface ApolloContact {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  city?: string;
  country?: string;
}

// ─── Enrich by email ──────────────────────────────────────

export async function enrichByEmail(email: string): Promise<ApolloContact | null> {
  try {
    const res = await axios.post(
      `${BASE}/people/match`,
      { email, reveal_personal_emails: false },
      { headers: HEADERS },
    );
    const person = res.data?.person;
    if (!person) return null;

    return {
      id: person.id,
      name: person.name,
      first_name: person.first_name,
      last_name: person.last_name,
      title: person.title,
      company: person.organization?.name,
      email: person.email,
      linkedin_url: person.linkedin_url,
      city: person.city,
      country: person.country,
    };
  } catch {
    return null;
  }
}

// ─── Search people (prospecting) ──────────────────────────

export async function searchPeople(filters: {
  person_titles?: string[];
  person_locations?: string[];
  organization_num_employees_ranges?: string[];
  q_organization_domains_list?: string[];
  per_page?: number;
}) {
  try {
    const res = await axios.post(
      `${BASE}/mixed_people/search`,
      { ...filters, per_page: filters.per_page ?? 10 },
      { headers: HEADERS },
    );
    return res.data?.people ?? [];
  } catch {
    return [];
  }
}

// ─── Create contact in Apollo ─────────────────────────────

export async function createContact(data: {
  email?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  title?: string;
  phone?: string;
}): Promise<string | null> {
  try {
    const res = await axios.post(`${BASE}/contacts`, data, { headers: HEADERS });
    return res.data?.contact?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Enrich visitor and save to DB ────────────────────────

export async function enrichVisitor(
  visitorId: string,
  email: string,
): Promise<ApolloContact | null> {
  // Check if already enriched
  const profile = await prisma.visitorProfile.findUnique({ where: { visitorId } });
  if (profile?.apolloEnriched) return profile.apolloData as ApolloContact;

  const data = await enrichByEmail(email);

  if (data) {
    await prisma.visitorProfile.upsert({
      where: { visitorId },
      create: {
        visitorId,
        apolloData: data as object,
        apolloEnriched: true,
      },
      update: {
        apolloData: data as object,
        apolloEnriched: true,
      },
    });
  }

  return data;
}
