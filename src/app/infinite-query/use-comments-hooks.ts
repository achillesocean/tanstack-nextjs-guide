import { fetchData, postData } from "@/lib/fetch-utils";
import {
  InfiniteData,
  QueryKey,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Comment } from "../api/comments/data";
import { CommentsResponse } from "../api/comments/route";

const queryKey: QueryKey = ["comments"];

export function useCommentsQuery() {
  // the useInfiniteQuery below is like its annotated with <InfiniteData<CommentsResponse, number | undefined>>
  return useInfiniteQuery({
    queryKey,
    // pageParam contains the next cursor. how do we pass it in though?
    queryFn: ({ pageParam }) =>
      fetchData<CommentsResponse>(
        `/api/comments?${pageParam ? `cursor=${pageParam}` : ""}`
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useCreateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // you could just text: string, or { text: string } or what you got below.
    mutationFn: (newComment: { text: string }) =>
      postData<{ comment: Comment }>("/api/comments", newComment),

    // with the refetching version, you can return the promise returned from invalidateQueries, so that the isPending state will stay true till invalidation is over.
    onSuccess: async ({ comment }) => {
      // Cancel any outgoing refetches to avoid them overwriting our optimistic update
      // also, whenever updating cache reserve, always start by cancelling running queries
      await queryClient.cancelQueries({ queryKey });

      // Update the query cache with the new comment so we don't have to wait for the refetch
      queryClient.setQueryData<
        InfiniteData<CommentsResponse, number | undefined>
      >(queryKey, (oldData) => {
        // look how oldData is being updated like you update state.
        // Add the new comment to the first page of results
        const firstPage = oldData?.pages[0];

        if (firstPage) {
          return {
            ...oldData,
            pages: [
              {
                // this is the object of the first page only!
                ...firstPage,
                totalComments: firstPage.totalComments + 1,
                comments: [comment, ...firstPage.comments],
              },
              // here, we're adding back the rest of the pages. why not just ...oldData.pages?
              // you have to slice to remove the first page tht you've already modified above. and since we're not inside an object, it won't be done automatically.
              ...oldData.pages.slice(1),
            ],
          };
        }
      });
    },

    // You can still invalidate the query afterwards but it's not really necessary
  });
}
