use dioxus::prelude::*;

#[component]
pub fn SplitPane(cx: Scope) -> Element {
  let mut left_width = use_signal(cx, || 50.0f32);
  rsx! {
    div { class: "flex h-screen",
      div { style: "width: {left_width()}%;", "Video/Chat Left" }
      div {
        class: "w-2 bg-gray-300 cursor-col-resize hover:bg-blue-500",
        onpointerdown: move |_| { /* drag logic */ }
      }
      div { style: "width: {100-left_width()}%;", "Chat Right" }
    }
  }
}
