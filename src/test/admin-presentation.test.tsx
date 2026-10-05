import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarChart3, ClipboardList, CreditCard, UtensilsCrossed, Users, Bike } from "lucide-react";
import { writeFileSync } from "node:fs";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/admin",
  Link: ({ children, to, activeOptions, activeProps, ...props }: any) => <a href={to} {...props} data-status={to === "/admin" ? "active" : undefined}>{children}</a>,
}));
import { ConsoleShell } from "@/components/admin/console-shell";
import { Panel, StatCard, SectionTitle, GoldButton, Field } from "@/components/admin/bits";

const nav = [
  {to:"/admin",label:"Dashboard",icon:BarChart3,exact:true},
  {to:"/admin/orders",label:"Orders",icon:ClipboardList},
  {to:"/admin/dishes",label:"Dishes",icon:UtensilsCrossed},
  {to:"/admin/payments",label:"Payments",icon:CreditCard},
  {to:"/admin/staff",label:"Staff",icon:Users},
  {to:"/admin/riders",label:"Riders",icon:Bike},
];
function Fixture() {
 return <ConsoleShell brand="Kennedy Moon Grill" title="Store Admin Console" badge={<span>Administrator</span>} nav={nav}>
  <div className="space-y-6">
   <SectionTitle eyebrow="Restaurant operations" title="Today's overview" action={<GoldButton>Create order</GoldButton>} />
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
    <StatCard label="Live orders" value="12" tone="gold" /><StatCard label="Revenue" value="Rs 28,400" />
    <StatCard label="To verify" value="4" tone="bad" /><StatCard label="On duty" value="6" tone="good" />
   </div>
   <div className="grid gap-6 xl:grid-cols-3">
    <Panel title="Orders" className="xl:col-span-2" bodyClassName="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>{[1,2,3].map(i=><tr key={i}><td>MG-10{i}</td><td>Example customer</td><td><span className="text-jade">Verified</span></td><td>Rs 1,250</td></tr>)}</tbody></table></div></Panel>
    <Panel title="Create rider profile"><div className="space-y-4"><Field label="Full name"><input className="field-lux" placeholder="Rider name" /></Field><Field label="Phone"><input className="field-lux" placeholder="03xx xxxxxxx" /></Field><GoldButton>Add rider</GoldButton></div></Panel>
   </div>
  </div>
 </ConsoleShell>;
}
afterEach(cleanup);
describe("Admin presentation", () => {
 it("collapses to an icon rail and restores it", () => {
  const {container}=render(<Fixture />);
  fireEvent.click(screen.getByRole("button",{name:"Collapse sidebar"}));
  expect(container.querySelector(".console-collapsed")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Expand sidebar"}));
  expect(container.querySelector(".console-collapsed")).toBeNull();
 });
 it("opens the full phone menu and limits bottom shortcuts", () => {
  const {container}=render(<Fixture />);
  expect(container.querySelectorAll(".admin-console > nav a")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button",{name:"Open menu"}));
  expect(screen.getAllByRole("button",{name:"Close menu"})).toHaveLength(2);
 });
 it("keeps theme scope confined to admin and writes an isolated visual fixture", () => {
  const {container,unmount}=render(<Fixture />);
  expect(document.body).toHaveClass("admin-theme-open");
  writeFileSync("/tmp/browser/admin-redesign/fixture.html",container.innerHTML);
  unmount();
  expect(document.body).not.toHaveClass("admin-theme-open");
 });
});