import dotenv from "dotenv";
dotenv.config();

export const platforms = {
  "remote-only": [
    {
      name: "RemoteOK",
      engine: "json-api",
      url: "https://remoteok.com/api",
      mapping: {
        resultsPath: null,
        title: "position",
        company: "company",
        url: "url",
        applyUrl: "apply_url",
        tags: "tags",
        date: "date",
        location: "location",
        description: "description",
        sourceSeniority: "tags"
      }
    },
    {
      name: "Remotive",
      engine: "json-api",
      url: "https://remotive.com/api/remote-jobs?limit=50",
      queryParam: "search",
      mapping: {
        resultsPath: "jobs",
        title: "title",
        company: "company_name",
        url: "url",
        location: "candidate_required_location",
        description: "description"
      }
    },
    {
      name: "Himalayas",
      engine: "json-api",
      url: "https://himalayas.app/jobs/api?limit=100",
      mapping: {
        resultsPath: "jobs",
        title: "title",
        company: "companyName",
        url: "applicationLink",
        location: "locationRestrictions",
        description: "description",
        sourceSeniority: "seniority"
      }
    },
    {
      name: "Jobicy",
      engine: "json-api",
      url: "https://jobicy.com/api/v2/remote-jobs?count=50",
      queryParam: "tag",
      mapping: {
        resultsPath: "jobs",
        title: "jobTitle",
        company: "companyName",
        url: "url",
        location: "jobGeo",
        description: "jobDescription",
        sourceSeniority: "jobLevel"
      }
    },
    {
      name: "WeWorkRemotely",
      engine: "rss",
      url: "https://weworkremotely.com/remote-jobs.rss",
      defaultLocation: "Remote"
    },
    {
      name: "RemoteCo",
      engine: "unsupported"
    },
    {
      name: "JSRemotely",
      engine: "unsupported"
    },
    {
      name: "RealWorkFromAnywhere",
      engine: "rss",
      url: "https://www.realworkfromanywhere.com/rss.xml",
      defaultLocation: "Remote"
    },
    {
      name: "Jobspresso",
      engine: "rss",
      url: "https://jobspresso.co/feed/?post_type=job_listing",
      defaultLocation: "Remote"
    },
    {
      name: "JobsCollider",
      engine: "rss",
      url: "https://jobscollider.com/remote-jobs.rss",
      defaultLocation: "Remote"
    }
  ],
  "hybrid": [
    {
      name: "Arbeitnow",
      engine: "json-api",
      url: "https://www.arbeitnow.com/api/job-board-api",
      queryParam: "search",
      mapping: {
        resultsPath: "data",
        title: "title",
        company: "company_name",
        url: "url",
        tags: "tags",
        date: "created_at",
        location: "location",
        description: "description"
      }
    },
    {
      name: "HackerNewsJobs",
      engine: "rss",
      url: "https://hnrss.org/jobs",
      defaultLocation: "Hybrid"
    },
    {
      name: "AuthenticJobs",
      engine: "rss",
      url: "https://authenticjobs.com/feed/",
      defaultLocation: "Hybrid"
    },
    {
      name: "Larajobs",
      engine: "rss",
      url: "https://larajobs.com/feed",
      defaultLocation: "Hybrid"
    },
    {
      name: "Indeed",
      engine: "authorized-api",
      apiKey: process.env.INDEED_API_KEY || null,
      url: "https://api.indeed.com/ads/apisearch?publisher={apiKey}&q={search}&l=Remote&v=2&format=json",
      mapping: {
        resultsPath: "results",
        title: "jobtitle",
        company: "company",
        url: "url",
        date: "date",
        location: "formattedLocation",
        description: "snippet"
      }
    },
    {
      name: "LinkedIn",
      engine: "authorized-api",
      apiKey: process.env.LINKEDIN_API_KEY || null,
      url: "https://api.linkedin.com/v2/jobSearch?q=keywords&keywords={search}",
      headers: {
        "Authorization": "Bearer {apiKey}"
      },
      mapping: {
        resultsPath: "elements",
        title: "title",
        company: "companyName",
        url: "applyUrl",
        description: "description"
      }
    },
    {
      name: "ZipRecruiter",
      engine: "authorized-api",
      apiKey: process.env.ZIPRECRUITER_API_KEY || null,
      url: "https://api.ziprecruiter.com/jobs/v1?search={search}&location=Remote&api_key={apiKey}",
      mapping: {
        resultsPath: "jobs",
        title: "name",
        company: "hiring_company.name",
        url: "url",
        date: "posted_time",
        location: "location",
        description: "description"
      }
    },
    {
      name: "Glassdoor",
      engine: "authorized-api",
      apiKey: process.env.GLASSDOOR_API_KEY || null,
      url: "https://api.glassdoor.com/v1/api.htm?v=1&format=json&t.p={apiKey}&t.k={apiKey}&action=jobs&q={search}",
      mapping: {
        resultsPath: "response.jobs",
        title: "jobTitle",
        company: "employerName",
        url: "attributionUrl",
        location: "location",
        description: "jobTitle"
      }
    },
    {
      name: "SimplyHired",
      engine: "authorized-api",
      apiKey: process.env.SIMPLYHIRED_API_KEY || null,
      url: "https://api.simplyhired.com/v1/jobs?apiKey={apiKey}&q={search}&l=Remote",
      mapping: {
        resultsPath: "jobs",
        title: "title",
        company: "company",
        url: "url",
        location: "location",
        description: "title"
      }
    },
    {
      name: "USAJOBS",
      engine: "authorized-api",
      apiKey: process.env.USAJOBS_API_KEY || null,
      url: "https://developer.usajobs.gov/api/Search?Keyword={search}",
      headers: {
        "Authorization-Key": "{apiKey}",
        "User-Agent": process.env.USAJOBS_EMAIL || "developer@example.com"
      },
      mapping: {
        resultsPath: "SearchResult.SearchResultItems",
        title: "MatchedObjectDescriptor.PositionTitle",
        company: "MatchedObjectDescriptor.OrganizationName",
        url: "MatchedObjectDescriptor.PositionURI",
        date: "MatchedObjectDescriptor.PublicationStartDate",
        location: "MatchedObjectDescriptor.PositionLocation.0.LocationName",
        description: "MatchedObjectDescriptor.UserArea.Details.JobSummary"
      }
    }
  ]
};
