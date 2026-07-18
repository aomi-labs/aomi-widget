#!/usr/bin/env python3
"""Generate AomiBench result charts F12-F17 as a matched set."""
import json, csv, collections
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
import numpy as np

plt.rcParams.update({
    "font.family": "monospace",
    "font.size": 12,
    "axes.edgecolor": "#9CA3AF",
    "axes.linewidth": 0.8,
    "text.color": "#1f2937",
    "axes.labelcolor": "#1f2937",
    "xtick.color": "#374151",
    "ytick.color": "#374151",
})

GREEN="#1D9E75"; AMBER="#EF9F27"; RED="#D85A30"; PURPLE="#7F77DD"; GREY="#9CA3AF"
ROOT="/sessions/tender-vigilant-faraday/mnt/aomi-bench-v0.1"
OUT=ROOT+"/figures"

# ---- load per-model ----
rows=list(csv.DictReader(open(f"{ROOT}/batch1/per_model.csv")))
disp={"claude-opus-4-6":"opus-4.6","claude-opus-4-8":"opus-4.8","claude-sonnet-4-6":"sonnet-4.6",
      "gpt-5.5":"gpt-5.5","claude-opus-4-7":"opus-4.7","minimax/minimax-m2.5":"minimax-m2.5",
      "claude-haiku-4-5":"haiku-4.5"}
M={}
for r in rows:
    name=disp.get(r["model"], r["model"])
    M[name]=dict(sr=float(r["SR@1"])*100, lat=float(r["lat_s"]),
                 tok=float(r["tok_out"]), cost=float(r["credits_med"]))
aomi={}
for r in csv.DictReader(open(f"{ROOT}/batch2/aomi_score.csv")):
    aomi[disp.get(r["model"], r["model"])]=float(r["aomi_score"])
for k in M: M[k]["aomi"]=aomi.get(k)

def tier(sr): return GREEN if sr>=90 else (AMBER if sr>=83 else RED)

# ===== F12 difficulty split =====
fig,ax=plt.subplots(figsize=(9.5,3.4))
for val,c in [(28,GREEN),(22,AMBER),(0,RED)]:
    pass
left=0
for val,c in [(28,GREEN),(22,AMBER),(0,RED)]:
    if val>0:
        ax.barh(0,val,left=left,color=c,edgecolor="white",height=0.45)
        ax.text(left+val/2,0,f"{val}   ({val/50*100:.0f}%)",ha="center",va="center",
                color="white",fontweight="bold",fontsize=13)
    left+=val
ax.text(50.4,0,"0 unsolved",va="center",fontsize=11,color="#6b7280")
ax.set_xlim(0,50); ax.set_ylim(-0.6,0.6); ax.set_yticks([])
ax.set_xlabel("specs (of 50)")
for s in ["top","right","left"]: ax.spines[s].set_visible(False)
ax.set_title("Figure 12 — Task difficulty split (50 specs)",fontweight="bold",fontsize=14,pad=16)
ax.legend(handles=[Patch(color=GREEN,label="saturated — every model passed, both passes"),
                   Patch(color=AMBER,label="separating — split the field"),
                   Patch(color=RED,label="unsolved — no model passed")],
          loc="upper center",bbox_to_anchor=(0.5,-0.6),ncol=1,frameon=False,fontsize=10.5)
plt.subplots_adjust(bottom=0.45,top=0.8)
plt.savefig(f"{OUT}/f12_difficulty_split.png",dpi=120,bbox_inches="tight"); plt.close()

# ===== F13 task success rate by family =====
fam=list(csv.DictReader(open(f"{ROOT}/batch2/family_sr.csv")))
flabel={"1_wallet_readonly":"Wallet /\nread-only","2_transfers_sig":"Transfers /\nsig",
        "3_swaps_quotes":"Swaps /\nquotes","4_lending_borrowing":"Lending /\nborrow",
        "5_staking_restaking":"Staking /\nrestaking","6_liquidity":"Liquidity",
        "7_bridging_reviewfirst":"Bridging /\nreview-first"}
fam_sorted=sorted(fam,key=lambda r:float(r["sr1"]),reverse=True)
labels=[flabel[r["family"]] for r in fam_sorted]
vals=[float(r["sr1"])*100 for r in fam_sorted]
ns=[int(r["n_specs"]) for r in fam_sorted]
fig,ax=plt.subplots(figsize=(11,6))
bars=ax.bar(labels,vals,color=[tier(v) for v in vals],width=0.72,zorder=3)
ax.axhline(90.6,ls="--",color="#9CA3AF",lw=1.3,zorder=2)
ax.text(6.5,91.4,"overall 90.6%",ha="right",color="#6b7280",fontsize=11)
for b,v,n in zip(bars,vals,ns):
    ax.text(b.get_x()+b.get_width()/2,v+0.8,f"{v:.1f}%",ha="center",fontweight="bold",fontsize=12)
    ax.text(b.get_x()+b.get_width()/2,2,f"n={n}",ha="center",color="white",fontsize=10)
ax.set_ylim(0,104); ax.set_ylabel("Task success rate (%)")
for s in ["top","right"]: ax.spines[s].set_visible(False)
ax.set_title("Figure 13 — Task success rate by family (all models)",fontweight="bold",fontsize=14,pad=12)
plt.tight_layout(); plt.savefig(f"{OUT}/f13_sr_by_family.png",dpi=120,bbox_inches="tight"); plt.close()

# ===== F14 model x family heatmap =====
runs=json.load(open(f"{ROOT}/batch2/run_scores.json"))
spec_fam=json.load(open(f"{ROOT}/batch2/family_map.json"))["spec_family"]
order_m=["opus-4.6","opus-4.8","sonnet-4.6","gpt-5.5","opus-4.7","minimax-m2.5","haiku-4.5"]
order_f=["1_wallet_readonly","2_transfers_sig","3_swaps_quotes","4_lending_borrowing",
         "5_staking_restaking","6_liquidity","7_bridging_reviewfirst"]
agg=collections.defaultdict(lambda:[0,0])
for r in runs:
    m=disp.get(r["model"],r["model"]); f=spec_fam.get(r["spec"])
    if f is None: continue
    agg[(m,f)][1]+=1; agg[(m,f)][0]+=1 if r["passed"] else 0
Z=np.zeros((len(order_m),len(order_f)))
for i,m in enumerate(order_m):
    for j,f in enumerate(order_f):
        p,t=agg[(m,f)]; Z[i,j]=100*p/t if t else np.nan
fig,ax=plt.subplots(figsize=(11,6.2))
im=ax.imshow(Z,cmap="RdYlGn",vmin=30,vmax=100,aspect="auto")
ax.set_xticks(range(len(order_f))); ax.set_xticklabels([flabel[f] for f in order_f])
ax.set_yticks(range(len(order_m))); ax.set_yticklabels(order_m)
for i in range(len(order_m)):
    for j in range(len(order_f)):
        v=Z[i,j]
        ax.text(j,i,f"{v:.0f}",ha="center",va="center",
                color="white" if (v<55 or v>=99) else "#1f2937",fontweight="bold",fontsize=11)
ax.set_xticks(np.arange(-.5,len(order_f),1),minor=True)
ax.set_yticks(np.arange(-.5,len(order_m),1),minor=True)
ax.grid(which="minor",color="white",lw=2); ax.tick_params(which="minor",length=0)
cb=fig.colorbar(im,ax=ax,fraction=0.035,pad=0.02); cb.set_label("Task success rate (%)")
ax.set_title("Figure 14 — Task success rate by model × family (%)",fontweight="bold",fontsize=14,pad=12)
plt.tight_layout(); plt.savefig(f"{OUT}/f14_model_family_heatmap.png",dpi=120,bbox_inches="tight"); plt.close()

# ===== F15 cost vs success (Pareto) =====
pts=[(k,M[k]["cost"],M[k]["sr"]) for k in order_m]
# pareto: best sr at lowest cost -> a point is optimal if no other has <=cost and >=sr (and strictly better)
def dominated(c,s):
    return any((cc<=c and ss>=s) and (cc<c or ss>s) for _,cc,ss in pts)
fig,ax=plt.subplots(figsize=(10.5,7))
front=sorted([(c,s,k) for k,c,s in pts if not dominated(c,s)])
ax.plot([c for c,_,_ in front],[s for _,s,_ in front],color=GREEN,lw=2,zorder=2)
# label offsets to avoid crowding (dx,dy in points)
off={"opus-4.6":(8,6),"opus-4.8":(8,-14),"opus-4.7":(8,-14),"gpt-5.5":(8,6),
     "sonnet-4.6":(-6,10),"minimax-m2.5":(10,4),"haiku-4.5":(10,-14)}
for k,c,s in pts:
    opt=not dominated(c,s)
    ax.scatter(c,s,s=240,color=GREEN if opt else GREY,zorder=3,edgecolor="white",linewidth=1.2)
    dx,dy=off.get(k,(8,6))
    ax.annotate(k,(c,s),textcoords="offset points",xytext=(dx,dy),fontsize=11,fontweight="bold")
ax.set_xlabel("Median cost per task (Aomi credits)"); ax.set_ylabel("Task success rate (%)")
ax.set_ylim(70,101)
for sp in ["top","right"]: ax.spines[sp].set_visible(False)
ax.text(0.98,0.04,"green = Pareto-optimal (best task success at lowest cost)",
        transform=ax.transAxes,ha="right",color="#6b7280",fontsize=10)
ax.set_title("Figure 15 — Cost vs. task success (Pareto frontier)",fontweight="bold",fontsize=14,pad=12)
plt.tight_layout(); plt.savefig(f"{OUT}/f15_cost_vs_success.png",dpi=120,bbox_inches="tight"); plt.close()

# ===== F16 latency =====
lat_sorted=sorted(order_m,key=lambda k:M[k]["lat"])
fig,ax=plt.subplots(figsize=(10.5,6))
y=range(len(lat_sorted))
ax.barh(list(y),[M[k]["lat"] for k in lat_sorted],color=PURPLE,height=0.62,zorder=3)
for i,k in enumerate(lat_sorted):
    ax.text(M[k]["lat"]+0.6,i,f"{M[k]['lat']:.1f}s",va="center",fontweight="bold",fontsize=11)
ax.set_yticks(list(y)); ax.set_yticklabels(lat_sorted); ax.invert_yaxis()
ax.set_xlabel("Mean elapsed time per test (s)"); ax.set_xlim(0,62)
for sp in ["top","right"]: ax.spines[sp].set_visible(False)
ax.set_title("Figure 16 — Mean elapsed time per model",fontweight="bold",fontsize=14,pad=12)
plt.tight_layout(); plt.savefig(f"{OUT}/f16_latency.png",dpi=120,bbox_inches="tight"); plt.close()

# ===== F17 output tokens (annotated with success) =====
tok_sorted=sorted(order_m,key=lambda k:M[k]["tok"],reverse=True)
fig,ax=plt.subplots(figsize=(10.5,6))
y=range(len(tok_sorted))
cols=[GREEN if M[k]["sr"]>=90 else (AMBER if M[k]["sr"]>=80 else RED) for k in tok_sorted]
ax.barh(list(y),[M[k]["tok"] for k in tok_sorted],color=cols,height=0.62,zorder=3)
for i,k in enumerate(tok_sorted):
    ax.text(M[k]["tok"]+22,i,f"{M[k]['tok']:.0f} tok  ·  {M[k]['sr']:.0f}% success",
            va="center",fontsize=10,color="#374151")
ax.set_yticks(list(y)); ax.set_yticklabels(tok_sorted); ax.invert_yaxis()
ax.set_xlabel("Mean output tokens per test"); ax.set_xlim(0,2350)
for sp in ["top","right"]: ax.spines[sp].set_visible(False)
ax.legend(handles=[Patch(color=GREEN,label="≥90% success"),Patch(color=RED,label="<80% success")],
          loc="lower right",frameon=False,fontsize=10)
ax.set_title("Figure 17 — Output tokens per test  (verbosity ≠ accuracy)",fontweight="bold",fontsize=14,pad=12)
plt.tight_layout(); plt.savefig(f"{OUT}/f17_output_tokens.png",dpi=120,bbox_inches="tight"); plt.close()

print("done: f12-f17 written")
