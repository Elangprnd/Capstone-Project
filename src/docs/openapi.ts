
export const openAPISpec = {
  openapi: "3.0.3",
  info: {
    title: "VOLETRA API",
    description: "API Documentation for VOLETRA (Volunteer Tracking and Management) Platform. This API handles user authentication, mission management (CRUD + Geocoding), and volunteer applications with race-condition safety.",
    version: "1.0.0",
    contact: {
      name: "VOLETRA Team",
      url: "https://voletra.id",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and Authorization" },
    { name: "Misi", description: "Mission Management" },
    { name: "Apply", description: "Volunteer Application Management" },
    { name: "User", description: "User Profile Management" },
    { name: "Edukasi", description: "Educational Resources" },
    { name: "Admin", description: "Administrator Control Panel" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token for authentication. Role-based access applies.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "ERROR_CODE" },
          message: { type: "string", example: "Error message details" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "Input tidak valid" },
          errors: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          user_id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["volunteer", "lembaga", "super_admin"] },
        },
      },
      Mission: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["pendidikan", "tanggap_bencana", "medis", "logistik"] },
          event_mode: { type: "string", enum: ["offline", "online"] },
          location: { type: "string" },
          latitude: { type: "string", nullable: true },
          longitude: { type: "string", nullable: true },
          volunteersNeeded: { type: "integer" },
          volunteersApplied: { type: "integer" },
          status: { type: "string", enum: ["menunggu_relawan", "sedang_berjalan", "relawan_terkumpul", "selesai"] },
          photos: { type: "array", items: { type: "string", format: "uri" } },
          contact_link: { type: "string", format: "uri" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          coordinator_whatsapp: { type: "string", description: "Hanya visible ke relawan yang sudah approved" },
        },
      },
      Application: {
        type: "object",
        properties: {
          apply_id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          full_name: { type: "string" },
          birth_date: { type: "string", format: "date-time" },
          phone_number: { type: "string" },
          domicile: { type: "string" },
          skills_url: { type: "string", format: "uri" },
          video_link: { type: "string", format: "uri", nullable: true },
          status: { type: "string", enum: ["pending", "approved", "rejected", "cancelled"] },
        },
      },
      Edukasi: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          judul_materi: { type: "string" },
          deskripsi_materi: { type: "string" },
          kategori_materi: { type: "string" },
          link_video: { type: "string", format: "uri" },
          thumbnail: { type: "string", format: "uri" },
          author_id: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/auth/register/volunteer": {
      post: {
        tags: ["Auth"],
        summary: "Register as a Volunteer",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "confirm_password", "role"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                  confirm_password: { type: "string", format: "password" },
                  role: { type: "string", enum: ["volunteer"] },
                },
              },
              examples: {
                volunteer_reg: {
                  summary: "Volunteer Registration Example",
                  value: {
                    name: "Alex Johnson",
                    email: "volunteer@example.com",
                    password: "Password123",
                    confirm_password: "Password123",
                    role: "volunteer"
                  }
                }
              }
            },
          },
        },
        responses: {
          201: {
            description: "Registrasi berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Registrasi berhasil!" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/schemas/ValidationError" },
        },
      },
    },
    "/api/auth/register/lembaga": {
      post: {
        tags: ["Auth"],
        summary: "Register as an Institution (Lembaga)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["institution_name", "email", "password", "confirm_password", "role"],
                properties: {
                  institution_name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                  confirm_password: { type: "string", format: "password" },
                  role: { type: "string", enum: ["lembaga"] },
                },
              },
              examples: {
                lembaga_reg: {
                  summary: "Lembaga Registration Example",
                  value: {
                    institution_name: "Hope Foundation",
                    email: "pelapor@example.com",
                    password: "Password123",
                    confirm_password: "Password123",
                    role: "lembaga"
                  }
                }
              }
            },
          },
        },
        responses: {
          201: {
            description: "Registrasi berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Registrasi institusi berhasil!" },
                    data: { $ref: "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/schemas/ValidationError" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
              examples: {
                login_example: {
                  summary: "Login Example",
                  value: {
                    email: "volunteer@example.com",
                    password: "Password123"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Login berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Login berhasil!" },
                    data: {
                      type: "object",
                      properties: {
                        role: { type: "string", example: "volunteer" },
                        redirect_url: { type: "string", example: "/" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/schemas/Error" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        responses: {
          200: {
            description: "Logout berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Logout berhasil." }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Google OAuth Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id_token"],
                properties: {
                  id_token: { type: "string" },
                },
              },
              examples: {
                google_example: {
                  summary: "Google Auth Example",
                  value: {
                    id_token: "eyJhbGciOiJSUzI1NiIs..."
                  }
                }
              }
            },
          },
        },
        responses: {
          200: { description: "Login berhasil" },
          201: { description: "Akun baru berhasil dibuat" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Forgot Password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
              examples: {
                forgot_example: {
                  summary: "Forgot Password Example",
                  value: {
                    email: "volunteer@example.com"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Reset link sent (if email exists)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Jika email terdaftar, link reset telah dikirim." }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset Password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "new_password"],
                properties: {
                  token: { type: "string" },
                  new_password: { type: "string", format: "password" },
                },
              },
              examples: {
                reset_example: {
                  summary: "Reset Password Example",
                  value: {
                    token: "replace-with-token",
                    new_password: "NewPassword123"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Password berhasil direset",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password berhasil direset. Silakan login kembali." }
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/schemas/ValidationError" },
        },
      },
    },
    "/api/misi": {
      get: {
        tags: ["Misi"],
        summary: "Get All Missions",
        parameters: [
          { name: "lat", in: "query", schema: { type: "number" }, example: -6.200000 },
          { name: "lng", in: "query", schema: { type: "number" }, example: 106.816666 },
          { name: "radius", in: "query", schema: { type: "number" }, description: "Radius in km", example: 10 },
          { name: "category", in: "query", schema: { type: "string" }, example: "pendidikan" },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Mission" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Misi"],
        summary: "Create New Mission",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["title", "description", "category", "location", "event_mode", "volunteers_needed"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string", enum: ["pendidikan", "tanggap_bencana", "medis", "logistik"] },
                  event_mode: { type: "string", enum: ["offline", "online"] },
                  location: { type: "string" },
                  volunteers_needed: { type: "integer" },
                  contact_link: { type: "string" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                  image: { type: "string", format: "binary" },
                },
              },
              examples: {
                offline_mission: {
                  summary: "Offline Mission Example",
                  value: {
                    title: "Flood Relief Jakarta",
                    description: "Helping distribute food and logistics",
                    category: "tanggap_bencana",
                    volunteers_needed: 20,
                    event_mode: "offline",
                    location: "Jakarta Selatan",
                    start_date: "2026-06-01",
                    end_date: "2026-06-05",
                    contact_link: "https://wa.me/6281234567890"
                  }
                },
                online_mission: {
                  summary: "Online Mission Example",
                  value: {
                    title: "Online Teaching Volunteer",
                    description: "Teaching basic programming through online sessions",
                    category: "pendidikan",
                    volunteers_needed: 5,
                    event_mode: "online",
                    location: "Remote / Indonesia",
                    start_date: "2026-06-10",
                    end_date: "2026-06-20",
                    contact_link: "https://wa.me/6281234567890"
                  }
                }
              }
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Misi berhasil dibuat" },
                    id: { type: "string", format: "uuid" }
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/schemas/ValidationError" },
        },
      },
    },
    "/api/misi/{id}": {
      get: {
        tags: ["Misi"],
        summary: "Get Mission Detail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        responses: {
          200: { content: { "application/json": { schema: { $ref: "#/components/schemas/Mission" } } } },
          404: { $ref: "#/components/schemas/Error" },
        },
      },
      put: {
        tags: ["Misi"],
        summary: "Update Mission",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  event_mode: { type: "string" },
                  location: { type: "string" },
                  volunteers_needed: { type: "integer" },
                  contact_link: { type: "string" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                  image: { type: "string", format: "binary" },
                },
              },
              examples: {
                update_example: {
                  summary: "Partial Update Example",
                  value: {
                    title: "Flood Relief Jakarta Updated",
                    volunteers_needed: 25
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Misi berhasil diperbarui" }
                  }
                }
              }
            }
          },
        },
      },
      delete: {
        tags: ["Misi"],
        summary: "Delete Mission",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        responses: {
          200: {
            description: "Deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Misi berhasil dihapus" }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/misi/{id}/status": {
      patch: {
        tags: ["Misi"],
        summary: "Update Mission Status",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["sedang_berjalan", "selesai"] },
                },
              },
              examples: {
                status_update: {
                  summary: "Status Transition Example",
                  value: {
                    status: "sedang_berjalan"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Status misi berhasil diperbarui" }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/apply": {
      post: {
        tags: ["Apply"],
        summary: "Apply to a Mission",
        description: "Requires multipart/form-data. video_link is mandatory if mission is online.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["mission_id", "full_name", "birth_date", "phone_number", "domicile", "skills"],
                properties: {
                  mission_id: { type: "string", format: "uuid" },
                  full_name: { type: "string" },
                  birth_date: { type: "string", format: "date" },
                  phone_number: { type: "string" },
                  domicile: { type: "string" },
                  skills: { type: "string", format: "binary", description: "PDF/JPG/PNG file" },
                  video_link: { type: "string", description: "Required for online missions" },
                },
              },
              examples: {
                offline_apply: {
                  summary: "Offline Apply Example",
                  value: {
                    mission_id: "replace-with-mission-id",
                    full_name: "Sarah Mitchell",
                    birth_date: "1998-05-15",
                    phone_number: "081234567890",
                    domicile: "Jakarta"
                  }
                },
                online_apply: {
                  summary: "Online Apply Example",
                  value: {
                    mission_id: "replace-with-online-mission-id",
                    full_name: "Sarah Mitchell",
                    birth_date: "1998-05-15",
                    phone_number: "081234567890",
                    domicile: "Jakarta",
                    video_link: "https://youtube.com/watch?v=abc123"
                  }
                }
              }
            },
          },
        },
        responses: {
          201: {
            description: "Applied successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Berhasil apply misi" },
                    application_id: { type: "string", format: "uuid" },
                    status: { type: "string", example: "pending" }
                  }
                }
              }
            }
          },
          422: { $ref: "#/components/schemas/ValidationError" },
          409: { $ref: "#/components/schemas/Error" },
        },
      },
    },
    "/api/apply/me": {
      get: {
        tags: ["Apply"],
        summary: "Get My Applications",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      misi_id: { type: "string" },
                      judul: { type: "string" },
                      status: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/misi/{id}/applicants": {
      get: {
        tags: ["Misi"],
        summary: "Get Mission Applicants",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Application" } },
              },
            },
          },
        },
      },
    },
    "/api/apply/{id}/approve": {
      patch: {
        tags: ["Apply"],
        summary: "Approve Application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-apply-id" }],
        responses: {
          200: {
            description: "Approved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Relawan berhasil di-approve" }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/apply/{id}/reject": {
      patch: {
        tags: ["Apply"],
        summary: "Reject Application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-apply-id" }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { reason: { type: "string" } } },
              examples: {
                reject_example: {
                  summary: "Rejection Example",
                  value: {
                    reason: "Does not meet skill requirements"
                  }
                }
              }
            },
          },
        },
        responses: {
          200: {
            description: "Rejected",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Relawan berhasil ditolak" }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/apply/{id}": {
      delete: {
        tags: ["Apply"],
        summary: "Cancel Application",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-apply-id" }],
        responses: {
          200: {
            description: "Cancelled",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Pendaftaran berhasil dibatalkan" }
                  }
                }
              }
            }
          },
        },
      },
    },
    "/api/edukasi": {
      get: {
        tags: ["Edukasi"],
        summary: "Get All Educational Resources",
        parameters: [
          { name: "kategori", in: "query", schema: { type: "string" }, example: "pendidikan" },
          { name: "page", in: "query", schema: { type: "integer" }, example: 1 },
          { name: "limit", in: "query", schema: { type: "integer" }, example: 12 },
        ],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Edukasi" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Edukasi"],
        summary: "Create Educational Content",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["judul_materi", "deskripsi_materi", "kategori_materi", "link_video"],
                properties: {
                  judul_materi: { type: "string" },
                  deskripsi_materi: { type: "string" },
                  kategori_materi: { type: "string" },
                  link_video: { type: "string" },
                  thumbnail: { type: "string", format: "binary" },
                },
              },
              examples: {
                edukasi_example: {
                  summary: "Edukasi Creation Example",
                  value: {
                    judul_materi: "Belajar Mitigasi Bencana",
                    deskripsi_materi: "Materi edukasi tentang kesiapsiagaan banjir",
                    kategori_materi: "Kesiapsiagaan Bencana",
                    link_video: "https://youtube.com/watch?v=abc123"
                  }
                }
              }
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/api/edukasi/{id}": {
      get: {
        tags: ["Edukasi"],
        summary: "Get Edukasi Detail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        responses: { 200: { content: { "application/json": { schema: { $ref: "#/components/schemas/Edukasi" } } } } },
      },
      put: {
        tags: ["Edukasi"],
        summary: "Update Edukasi",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  judul_materi: { type: "string" },
                  deskripsi_materi: { type: "string" },
                  kategori_materi: { type: "string" },
                  link_video: { type: "string" },
                  thumbnail: { type: "string", format: "binary" },
                },
              },
              examples: {
                edukasi_update: {
                  summary: "Edukasi Update Example",
                  value: {
                    judul_materi: "Belajar Mitigasi Bencana Updated",
                    link_video: "https://drive.google.com/file/d/example/view"
                  }
                }
              }
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Edukasi"],
        summary: "Delete Edukasi",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, example: "replace-with-id" }],
        responses: { 200: { description: "Deleted" } },
      },
    },
  },
} as const
