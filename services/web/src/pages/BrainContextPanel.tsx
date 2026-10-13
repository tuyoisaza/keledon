import { Building2, Loader2, Tag } from 'lucide-react';
import type { Brand, Company, Team } from '@/lib/crud-api';
import type { Dispatch, SetStateAction } from 'react';


type BrainContextPanelProps = {
  loading: boolean;
  selectedCompanyId: string;
  handleCompanyChange: (companyId: string) => void;
  companies: Company[];
  selectedBrandId: string;
  handleBrandChange: (brandId: string) => void;
  brandsForCompany: Brand[];
  selectedTeamId: string;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  teamsForBrand: Team[];
  configReady: boolean;
};

export function BrainContextPanel(props: BrainContextPanelProps) {
  return (
<section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">
              Context configuration
            </h2>
          </div>

          {props.loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading companies, brands, and teams...
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Company
                </span>
                <select
                  value={props.selectedCompanyId}
                  onChange={(e) => props.handleCompanyChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option value="">Select company</option>
                  {props.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Brand
                </span>
                <select
                  value={props.selectedBrandId}
                  onChange={(e) => props.handleBrandChange(e.target.value)}
                  disabled={!props.selectedCompanyId}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select brand</option>
                  {props.brandsForCompany.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Team
                </span>
                <select
                  value={props.selectedTeamId}
                  onChange={(e) => props.setSelectedTeamId(e.target.value)}
                  disabled={!props.selectedBrandId}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select team</option>
                  {props.teamsForBrand.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Tag className="h-4 w-4" />
                  Brain identity
                </div>
                <p className="mt-2">
                  The chat will use the selected company, brand, and team as the
                  brand frame of reference.
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {props.configReady
                    ? "Ready to chat"
                    : "Please complete all selections"}
                </p>
              </div>
            </div>
          )}
        </section>
  );
}
