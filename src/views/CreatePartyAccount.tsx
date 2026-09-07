import { useState } from "react";
import type { User } from "../data";
import { ROLE_LABEL } from "../data";
import { Btn, Panel } from "../ui";
import { useT } from "../i18n";
import { IcUsers, IcCheck } from "../icons";

interface Props {
  user: User;
  onCreatePartyAccount: (data: {
    name: string;
    role: "VICTIM" | "ACCUSED";
    email: string;
    phone: string;
    password: string;
    createdBy: string;
  }) => string | null;
}

export default function CreatePartyAccount({ user, onCreatePartyAccount }: Props) {
  const t = useT();
  const [formData, setFormData] = useState({
    name: "",
    role: "VICTIM" as "VICTIM" | "ACCUSED",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const result = onCreatePartyAccount({
      name: formData.name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      createdBy: user.id,
    });

    if (result) {
      setCreatedCode(result);
      setFormData({
        name: "",
        role: "VICTIM",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } else {
      setError("Failed to create account. Email may already be registered.");
    }
  };

  if (createdCode) {
    return (
      <div className="space-y-4">
        <Panel title="Account Created Successfully">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IcCheck c="w-8 h-8 text-green" />
            </div>
            <h3 className="text-xl font-semibold text-ink mb-2">
              {formData.role === "VICTIM" ? "Victim" : "Accused"} Account Created
            </h3>
            <p className="text-ink2 mb-4">
              The account has been created successfully. Share the following person code with the user:
            </p>
            <div className="bg-navy/5 border-2 border-dashed border-navy/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-ink3 mb-1">Person Code</p>
              <p className="text-2xl font-mono font-bold text-navy">{createdCode}</p>
            </div>
            <p className="text-sm text-ink2 mb-6">
              The user can now log in with their email and password. They will only need password authentication (no 3-factor).
            </p>
            <Btn kind="primary" onClick={() => setCreatedCode(null)}>
              Create Another Account
            </Btn>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Create Party Account">
        <div className="p-6">
          <div className="mb-6 p-4 bg-azure/5 border border-azure/20 rounded-lg">
            <div className="flex items-start gap-3">
              <IcUsers c="w-5 h-5 text-azure mt-0.5" />
              <div>
                <h3 className="font-semibold text-ink mb-1">Police Account Creation</h3>
                <p className="text-sm text-ink2">
                  As a police officer, you can create accounts for victims and accused persons. 
                  They will receive a person code and can log in with just their email and password.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "VICTIM" })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.role === "VICTIM"
                      ? "border-azure bg-azure/5 text-azure"
                      : "border-line hover:border-azure/50"
                  }`}
                >
                  <div className="font-semibold">Victim</div>
                  <div className="text-xs mt-1">Person filing a complaint</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "ACCUSED" })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.role === "ACCUSED"
                      ? "border-azure bg-azure/5 text-azure"
                      : "border-line hover:border-azure/50"
                  }`}
                >
                  <div className="font-semibold">Accused</div>
                  <div className="text-xs mt-1">Person being charged</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-navy"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-navy"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-navy"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-navy"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-lg focus:outline-none focus:border-navy"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-crimson/5 border border-crimson/20 rounded-lg text-crimson text-sm">
                {error}
              </div>
            )}

            <div className="pt-4">
              <Btn kind="primary" type="submit">
                Create Account
              </Btn>
            </div>
          </form>
        </div>
      </Panel>
    </div>
  );
}
